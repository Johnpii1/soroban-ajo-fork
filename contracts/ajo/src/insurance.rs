use soroban_sdk::{Address, Env};
use crate::storage;
use crate::types::{InsuranceClaim, ClaimStatus, InsurancePool, Group};
use crate::errors::AjoError;
use crate::utils;
use crate::events;

/// Calculates the insurance premium for a contribution.
pub fn calculate_premium(amount: i128, rate_bps: u32) -> i128 {
    (amount * (rate_bps as i128)) / 10000
}

/// Adds funds to the insurance pool for a token.
pub fn deposit_to_pool(env: &Env, token: &Address, amount: i128) {
    let mut pool = storage::get_insurance_pool(env, token).unwrap_or(InsurancePool {
        balance: 0,
        total_payouts: 0,
        pending_claims_count: 0,
    });
    pool.balance += amount;
    storage::store_insurance_pool(env, token, &pool);
}

/// Records a claim against the insurance pool.
pub fn file_claim(
    env: &Env,
    group_id: u64,
    cycle: u32,
    claimant: Address,
    defaulter: Address,
    amount: i128,
) -> Result<u64, AjoError> {
    let claim_id = storage::get_next_claim_id(env);
    let now = env.ledger().timestamp();

    let claim = InsuranceClaim {
        id: claim_id,
        group_id,
        cycle,
        defaulter,
        claimant,
        amount,
        status: ClaimStatus::Pending,
        created_at: now,
    };

    storage::store_insurance_claim(env, claim_id, &claim);

    // Update pool stats
    let group = storage::get_group(env, group_id).ok_or(AjoError::GroupNotFound)?;
    let mut pool = storage::get_insurance_pool(env, &group.token_address).unwrap_or(InsurancePool {
        balance: 0,
        total_payouts: 0,
        pending_claims_count: 0,
    });
    pool.pending_claims_count += 1;
    storage::store_insurance_pool(env, &group.token_address, &pool);

    // Emit event: claim filed
    events::emit_claim_filed(env, claim_id, group_id, cycle);

    Ok(claim_id)
}

/// Processes a claim and executes payout if approved.
pub fn process_claim(env: &Env, claim_id: u64, approved: bool) -> Result<(), AjoError> {
    let mut claim = storage::get_insurance_claim(env, claim_id).ok_or(AjoError::InvalidClaim)?;

    if claim.status != ClaimStatus::Pending {
        return Err(AjoError::ClaimAlreadyProcessed);
    }

    let group = storage::get_group(env, claim.group_id).ok_or(AjoError::GroupNotFound)?;
    let mut pool = storage::get_insurance_pool(env, &group.token_address).ok_or(AjoError::PoolNotFound)?;

    if approved {
        if pool.balance < claim.amount {
            return Err(AjoError::InsufficientPoolBalance);
        }

        // Payout from insurance pool
        pool.balance -= claim.amount;
        pool.total_payouts += claim.amount;
        claim.status = ClaimStatus::Paid;

        // Transfer tokens from contract to claimant
        crate::token::transfer_token(
            env,
            &group.token_address,
            &env.current_contract_address(),
            &claim.claimant,
            claim.amount,
        )?;

        // Emit approval event
        events::emit_claim_approved(env, claim_id, claim.group_id, &claim.claimant, claim.amount);
    } else {
        claim.status = ClaimStatus::Rejected;

        // Emit rejection event
        events::emit_claim_rejected(env, claim_id, claim.group_id);
    }

    pool.pending_claims_count -= 1;
    storage::store_insurance_pool(env, &group.token_address, &pool);
    storage::store_insurance_claim(env, claim_id, &claim);

    Ok(())
}

/// Verifies a claim automatically based on on-chain contribution data.
///
/// A claim is considered valid when:
/// 1. The grace period for that cycle has fully elapsed (too early → returns Ok(false))
/// 2. The alleged defaulter did NOT contribute during the specified cycle
///
/// # Arguments
/// * `env`      - The Soroban contract environment
/// * `claim_id` - ID of the claim to verify
///
/// # Returns
/// `Ok(true)`  – claim is valid (defaulter genuinely missed the cycle)
/// `Ok(false)` – claim is invalid or it is too early to decide
///
/// # Errors
/// * `InvalidClaim`   – if `claim_id` does not correspond to a stored claim
/// * `GroupNotFound`  – if the group referenced by the claim does not exist
pub fn verify_claim(env: &Env, claim_id: u64) -> Result<bool, AjoError> {
    let claim = storage::get_insurance_claim(env, claim_id)
        .ok_or(AjoError::InvalidClaim)?;

    let group = storage::get_group(env, claim.group_id)
        .ok_or(AjoError::GroupNotFound)?;

    // Only verify after the full grace period for that cycle has elapsed.
    // cycle_end = cycle_start_time + cycle_duration
    // grace_end = cycle_end + grace_period
    let cycle_end  = group.cycle_start_time + group.cycle_duration;
    let grace_end  = cycle_end + group.grace_period;
    let now        = utils::get_current_timestamp(env);

    if now < grace_end {
        // Grace period has not expired yet – too early to make a definitive ruling.
        events::emit_claim_verification_result(env, claim_id, claim.group_id, false, false);
        return Ok(false);
    }

    // Check whether the alleged defaulter actually contributed in the claimed cycle.
    let has_contributed = storage::has_contributed(
        env,
        claim.group_id,
        claim.cycle,
        &claim.defaulter,
    );

    // Claim is valid only when the defaulter did NOT contribute.
    let is_valid = !has_contributed;

    events::emit_claim_verification_result(env, claim_id, claim.group_id, true, is_valid);

    Ok(is_valid)
}

/// Automatically verifies and then processes a pending claim.
///
/// Combines `verify_claim` and `process_claim` in a single atomic call so that
/// any caller (or a scheduled keeper) can settle claims without manual admin
/// intervention.
///
/// Verification rules:
/// - If the grace period has not elapsed, the claim is **not yet processable**
///   and `AjoError::OutsideCycleWindow` is returned to signal the caller to retry later.
/// - If the defaulter is found to have contributed, the claim is auto-rejected.
/// - If the defaulter did not contribute (genuine default), the claim is auto-approved
///   and the claimant receives the insured payout from the pool.
///
/// # Arguments
/// * `env`      - The Soroban contract environment
/// * `claim_id` - ID of the claim to auto-process
///
/// # Returns
/// `Ok(())` on successful processing (approved or rejected).
///
/// # Errors
/// * `InvalidClaim`             – claim does not exist
/// * `ClaimAlreadyProcessed`    – claim is not in `Pending` state
/// * `GroupNotFound`            – referenced group does not exist
/// * `OutsideCycleWindow`       – grace period has not elapsed; retry later
/// * `InsufficientPoolBalance`  – pool cannot cover the claim amount
/// * `PoolNotFound`             – no insurance pool exists for the token
/// * `TransferFailed`           – token transfer to claimant failed
pub fn auto_process_claim(env: &Env, claim_id: u64) -> Result<(), AjoError> {
    // Retrieve claim first so we can guard against double-processing cheaply.
    let claim = storage::get_insurance_claim(env, claim_id)
        .ok_or(AjoError::InvalidClaim)?;

    if claim.status != ClaimStatus::Pending {
        return Err(AjoError::ClaimAlreadyProcessed);
    }

    // verify_claim returns Ok(false) when the grace period has not expired.
    let is_valid = verify_claim(env, claim_id)?;

    // Determine whether we are still within the window.
    let group = storage::get_group(env, claim.group_id)
        .ok_or(AjoError::GroupNotFound)?;

    let grace_end = group.cycle_start_time + group.cycle_duration + group.grace_period;
    let now       = utils::get_current_timestamp(env);

    if now < grace_end {
        // Cannot settle yet – caller should retry after grace_end.
        return Err(AjoError::OutsideCycleWindow);
    }

    // Settle the claim based on on-chain evidence.
    process_claim(env, claim_id, is_valid)
}

/// Returns the current balance and statistics of the insurance pool for a token.
///
/// # Arguments
/// * `env`   - The Soroban contract environment
/// * `token` - Token contract address for the pool to query
///
/// # Returns
/// `Ok(InsurancePool)` with balance and payout stats, or `AjoError::PoolNotFound`.
pub fn get_pool_info(env: &Env, token: &Address) -> Result<InsurancePool, AjoError> {
    storage::get_insurance_pool(env, token).ok_or(AjoError::PoolNotFound)
}

/// Calculates risk score for a member based on history.
pub fn get_member_risk_score(_env: &Env, _member: &Address) -> u32 {
    // Simplified: starts at 100 (best) and would be adjusted
    // by late/missed payment records in a full implementation.
    100
}

/// Calculates group risk rating.
pub fn get_group_risk_rating(_env: &Env, group: &Group) -> u32 {
    let total_members = group.members.len();
    if total_members == 0 {
        return 0;
    }
    // Simplified default medium-risk score.
    75
}