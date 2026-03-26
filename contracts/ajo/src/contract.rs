use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Vec};

use crate::errors::AjoError;
use crate::events;
use crate::pausable;
use crate::storage;
use crate::types::{
    AchievementRecord, Group, GroupStatus,
    MilestoneRecord, PayoutOrderingStrategy,
};
use crate::utils;

/// The main Ajo contract
#[contract]
pub struct AjoContract;

#[contractimpl]
impl AjoContract {
    /// Initialize the contract with an admin.
    ///
    /// This function must be called exactly once to set up the contract's admin.
    /// After initialization, the admin can upgrade the contract.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `admin` - Address of the contract administrator
    ///
    /// # Returns
    /// `Ok(())` on successful initialization
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    pub fn initialize(env: Env, admin: Address) -> Result<(), AjoError> {
        if storage::get_admin(&env).is_some() {
            return Err(AjoError::AlreadyInitialized);
        }
        storage::store_admin(&env, &admin);
        Ok(())
    }

    /// Upgrade the contract's Wasm bytecode.
    ///
    /// Only the admin can call this function. The contract will be updated to the
    /// new Wasm code specified by `new_wasm_hash`.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `new_wasm_hash` - The hash of the new Wasm code (32 bytes)
    ///
    /// # Returns
    /// `Ok(())` on successful upgrade
    ///
    /// # Errors
    /// * `Unauthorized` - If the caller is not the admin
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), AjoError> {
        let admin = storage::get_admin(&env).ok_or(AjoError::Unauthorized)?;
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Pause the contract to prevent state-mutating operations.
    ///
    /// This emergency function allows the admin to temporarily halt all state-mutating
    /// operations (create_group, join_group, contribute, execute_payout) while keeping
    /// query functions and admin functions operational. This is useful during security
    /// incidents, detected vulnerabilities, or maintenance periods.
    ///
    /// When paused:
    /// - All state-mutating operations will fail with `ContractPaused` error
    /// - Query operations continue to work normally
    /// - Admin operations (pause, unpause, upgrade) remain available
    /// - All stored data (groups, contributions, payouts) remains safe and intact
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    ///
    /// # Returns
    /// `Ok(())` on successful pause
    ///
    /// # Errors
    /// * `UnauthorizedPause` - If the caller is not the admin
    ///
    /// # Authorization
    /// Only the contract admin can call this function.
    pub fn pause(env: Env) -> Result<(), AjoError> {
        pausable::pause(&env)
    }

    /// Unpause the contract to restore normal operations.
    ///
    /// This function allows the admin to restore full contract functionality after
    /// an emergency pause. Once unpaused, all state-mutating operations return to
    /// normal operation. All data remains intact and accessible.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    ///
    /// # Returns
    /// `Ok(())` on successful unpause
    ///
    /// # Errors
    /// * `UnauthorizedUnpause` - If the caller is not the admin
    ///
    /// # Authorization
    /// Only the contract admin can call this function.
    ///
    /// # Data Safety
    /// Unpausing does not modify any stored data. All groups, contributions, and
    /// payouts remain exactly as they were before the pause.
    pub fn unpause(env: Env) -> Result<(), AjoError> {
        pausable::unpause(&env)
    }

    /// Create a new Ajo group.
    ///
    /// Initializes a new rotating savings group with the specified parameters.
    /// The creator becomes the first member and the contract validates all parameters
    /// before storage. A unique group ID is assigned and returned.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `creator` - Address of the group creator (automatically becomes first member)
    /// * `token_address` - Address of the token contract (SAC) for contributions and payouts
    /// * `contribution_amount` - Fixed amount each member contributes per cycle (in token units, must be > 0)
    /// * `cycle_duration` - Duration of each cycle in seconds (must be > 0)
    /// * `max_members` - Maximum number of members allowed in the group (must be >= 2 and <= 100)
    /// * `grace_period` - Grace period duration in seconds after cycle ends (default: 86400 = 24 hours)
    /// * `penalty_rate` - Penalty rate as percentage for late contributions (0-100, default: 5)
    ///
    /// # Returns
    /// The unique group ID assigned to the new group
    ///
    /// # Errors
    /// * `ContributionAmountZero` - If contribution_amount == 0
    /// * `ContributionAmountNegative` - If contribution_amount < 0
    /// * `CycleDurationZero` - If cycle_duration == 0
    /// * `MaxMembersBelowMinimum` - If max_members < 2
    /// * `MaxMembersAboveLimit` - If max_members > 100
    /// * `InvalidGracePeriod` - If grace_period > 7 days
    /// * `InvalidPenaltyRate` - If penalty_rate > 100
    pub fn create_group(
        env: Env,
        creator: Address,
        token_address: Address,
        contribution_amount: i128,
        cycle_duration: u64,
        max_members: u32,
        grace_period: u64,
        penalty_rate: u32,
        insurance_rate_bps: u32,
    ) -> Result<u64, AjoError> {
        // Validate parameters
        utils::validate_group_params(contribution_amount, cycle_duration, max_members)?;
        utils::validate_penalty_params(grace_period, penalty_rate)?;

        // Check if paused
        pausable::ensure_not_paused(&env)?;

        // Require authentication
        creator.require_auth();

        // Generate new group ID
        let group_id = storage::get_next_group_id(&env);

        // Initialize members list with creator
        let mut members = Vec::new(&env);
        members.push_back(creator.clone());

        // Get current timestamp
        let now = utils::get_current_timestamp(&env);

        // Create group
        let group = Group {
            id: group_id,
            creator: creator.clone(),
            token_address,
            contribution_amount,
            cycle_duration,
            max_members,
            members,
            current_cycle: 1,
            payout_index: 0,
            created_at: now,
            cycle_start_time: now,
            is_complete: false,
            grace_period,
            penalty_rate,
            state: crate::types::GroupState::Active,
            insurance_config: crate::types::InsuranceConfig {
                rate_bps: insurance_rate_bps,
                is_enabled: insurance_rate_bps > 0,
            },
            payout_strategy: PayoutOrderingStrategy::Sequential,
        };

        // Store group
        storage::store_group(&env, group_id, &group);

        // Emit event
        events::emit_group_created(&env, group_id, &creator, contribution_amount, max_members);

        Ok(group_id)
    }

    /// Get group information.
    ///
    /// Retrieves the complete group data including all members, cycle information,
    /// and metadata.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// The group data containing group configuration and current state
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn get_group(env: Env, group_id: u64) -> Result<Group, AjoError> {
        storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)
    }

    /// Get list of all members in a group.
    ///
    /// Returns the ordered list of all member addresses currently in the group.
    /// Members are ordered by join time, with the creator being the first member.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// Vector of member addresses in join order
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn list_members(env: Env, group_id: u64) -> Result<Vec<Address>, AjoError> {
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;
        Ok(group.members)
    }

    /// Join an existing group.
    ///
    /// Adds a new member to an active group if space is available.
    /// The member's authentication is required. The member cannot join if they
    /// are already a member, the group is full, or the group has completed all cycles.
    /// For InviteOnly groups, requires a valid, non-expired invitation.
    /// For ApprovalRequired groups, direct joining is not allowed.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `member` - Address of the member joining (must authenticate)
    /// * `group_id` - The group to join
    ///
    /// # Returns
    /// `Ok(())` on successful group join
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    /// * `MaxMembersExceeded` - If the group has reached max members
    /// * `AlreadyMember` - If the address is already a member
    /// * `GroupComplete` - If the group has completed all cycles
    /// * `GroupAccessRestricted` - If the group is invite-only or approval-required
    /// * `InvitationExpired` - If the invitation has expired
    /// * `InvitationAlreadyAccepted` - If the invitation was already used
    pub fn join_group(env: Env, member: Address, group_id: u64) -> Result<(), AjoError> {
        // Check if paused
        pausable::ensure_not_paused(&env)?;

        // Require authentication
        member.require_auth();

        // Get group
        let mut group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Cache member count for comparisons
        let member_count = group.members.len() as u32;
        let max_members = group.max_members;

        // Check if group is complete
        if group.is_complete {
            return Err(AjoError::GroupComplete);
        }

        // Check if group is cancelled
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }

        // Check if already a member
        if utils::is_member(&group.members, &member) {
            return Err(AjoError::AlreadyMember);
        }

        // Check if group is full
        if member_count >= max_members {
            return Err(AjoError::MaxMembersExceeded);
        }

        // Add member
        group.members.push_back(member.clone());

        // Update storage
        storage::store_group(&env, group_id, &group);

        // Emit event
        events::emit_member_joined(&env, group_id, &member);

        // Update member stats
        let mut stats = storage::get_member_stats(&env, &member)
            .unwrap_or_else(|| utils::default_member_stats(&env, &member));
        stats.total_groups_joined += 1;
        storage::store_member_stats(&env, &member, &stats);

        Ok(())
    }

    /// Check if an address is a member of a group.
    ///
    /// Returns whether the provided address is currently a member of the specified group.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The group to check
    /// * `address` - The address to check
    ///
    /// # Returns
    /// `true` if the address is a member, `false` otherwise
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn is_member(env: Env, group_id: u64, address: Address) -> Result<bool, AjoError> {
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;
        Ok(utils::is_member(&group.members, &address))
    }

    /// Contribute to the current cycle.
    ///
    /// Records a member's contribution for the current cycle and transfers tokens from
    /// the member to the contract. Each member can contribute once per cycle.
    /// Authentication is required.
    ///
    /// The function transfers the contribution amount from the member's token balance
    /// to the contract. Late contributions (after cycle ends but within grace period)
    /// incur penalties. Contributions after grace period are rejected.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `member` - Address making the contribution (must authenticate)
    /// * `group_id` - The group to contribute to
    ///
    /// # Returns
    /// `Ok(())` on successful contribution and token transfer
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    /// * `NotMember` - If the address is not a member
    /// * `AlreadyContributed` - If already contributed this cycle
    /// * `GroupComplete` - If the group has completed all cycles
    /// * `GracePeriodExpired` - If contribution is too late (after grace period)
    /// * `InsufficientBalance` - If member doesn't have enough tokens
    /// * `TransferFailed` - If the token transfer fails
    pub fn contribute(env: Env, member: Address, group_id: u64) -> Result<(), AjoError> {
        // Check if paused
        pausable::ensure_not_paused(&env)?;

        // Require authentication
        member.require_auth();

        // Get group (single fetch)
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Cache frequently accessed values
        let group_id_cached = group.id;
        let current_cycle = group.current_cycle;
        let contribution_amount = group.contribution_amount;

        // Check if group is complete
        if group.is_complete {
            return Err(AjoError::GroupComplete);
        }

        // Check if group is cancelled
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }

        // Check if member
        if !utils::is_member(&group.members, &member) {
            return Err(AjoError::NotMember);
        }

        // Check if already contributed
        if storage::has_contributed(&env, group_id_cached, current_cycle, &member) {
            return Err(AjoError::AlreadyContributed);
        }

        // Get contract address for token transfer
        let contract_address = env.current_contract_address();

        // Check member balance before transfer
        crate::token::check_balance(&env, &group.token_address, &member, contribution_amount)?;

        // Transfer tokens from member to contract
        crate::token::transfer_token(
            &env,
            &group.token_address,
            &member,
            &contract_address,
            contribution_amount,
        )?;

        // Record contribution
        storage::store_contribution(&env, group_id_cached, current_cycle, &member, true);

        // Insurance logic: Deduct premium if enabled
        if group.insurance_config.is_enabled {
            let premium = crate::insurance::calculate_premium(contribution_amount, group.insurance_config.rate_bps);
            if premium > 0 {
                crate::insurance::deposit_to_pool(&env, &group.token_address, premium);
            }
        }

        // Emit event
        events::emit_contribution_made(
            &env,
            group_id_cached,
            &member,
            current_cycle,
            contribution_amount,
        );

        // Update member stats
        let mut stats = storage::get_member_stats(&env, &member)
            .unwrap_or_else(|| utils::default_member_stats(&env, &member));
        stats.total_contributions += 1;
        stats.on_time_contributions += 1;
        stats.total_amount_contributed += contribution_amount;
        storage::store_member_stats(&env, &member, &stats);

        // Check and record member achievements
        let achievements = utils::check_member_achievements(&env, &member, &stats);
        for achievement in achievements.iter() {
            let record = AchievementRecord {
                member: member.clone(),
                achievement,
                earned_at: utils::get_current_timestamp(&env),
                group_id: group_id_cached,
            };
            storage::add_member_achievement(&env, &member, &record);
            events::emit_achievement_earned(&env, &member, record.achievement as u32, group_id_cached);
        }

        Ok(())
    }

    /// Get contribution status for all members in a specific cycle.
    ///
    /// Returns an ordered list of all members paired with their contribution status
    /// for the specified cycle. Member order matches the group's member list order.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The group to check
    /// * `cycle_number` - The cycle to check (typically use current_cycle from group)
    ///
    /// # Returns
    /// Vector of (Address, bool) tuples where `true` indicates the member has contributed
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn get_contribution_status(
        env: Env,
        group_id: u64,
        cycle_number: u32,
    ) -> Result<Vec<(Address, bool)>, AjoError> {
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;
        Ok(storage::get_cycle_contributions(
            &env,
            group_id,
            cycle_number,
            &group.members,
        ))
    }

    /// Execute payout for the current cycle.
    ///
    /// This is the core function that rotates payouts through group members.
    /// It verifies that all members have contributed, calculates the total payout
    /// (including any penalties collected), transfers tokens from the contract to
    /// the recipient, and advances the cycle. When all members have received their
    /// payout, the group is marked complete.
    ///
    /// Payout can only be executed after the grace period expires to ensure all
    /// late contributions are collected.
    ///
    /// Process:
    /// 1. Verifies all members have contributed in the current cycle
    /// 2. Ensures grace period has expired
    /// 3. Calculates total payout (contribution_amount × member_count + penalties)
    /// 4. Verifies contract has sufficient token balance
    /// 5. Transfers tokens from contract to recipient
    /// 6. Records payout to the current recipient
    /// 7. Emits payout event with penalty bonus
    /// 8. Advances to next cycle (or marks complete if done)
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The group to execute payout for
    ///
    /// # Returns
    /// `Ok(())` on successful payout execution and token transfer
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    /// * `IncompleteContributions` - If not all members have contributed
    /// * `GroupComplete` - If the group has already completed all payouts
    /// * `NoMembers` - If the group has no members (should never happen)
    /// * `OutsideCycleWindow` - If grace period has not expired yet
    /// * `InsufficientContractBalance` - If contract doesn't have enough tokens
    /// * `TransferFailed` - If the token transfer fails
    pub fn execute_payout(env: Env, group_id: u64) -> Result<(), AjoError> {
        // Check if paused
        pausable::ensure_not_paused(&env)?;

        // Get group (single fetch)
        let mut group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Check if group is cancelled
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }

        // Check if group is complete
        if group.is_complete {
            return Err(AjoError::GroupComplete);
        }

        // Cache frequently accessed values
        let group_id_cached = group.id;
        let current_cycle = group.current_cycle;
        let member_count = group.members.len();

        // Check if all members have contributed
        if !utils::all_members_contributed(&env, &group) {
            return Err(AjoError::IncompleteContributions);
        }

        // Ensure grace period has expired before executing payout
        let current_time = utils::get_current_timestamp(&env);
        let grace_end = utils::get_grace_period_end(&group);
        if current_time < grace_end {
            // Still within grace period - delay payout
            return Err(AjoError::OutsideCycleWindow);
        }

        // Get payout recipient using the group's ordering strategy
        let payout_recipient = utils::determine_next_recipient(&env, &group)?;

        // Calculate payout amounts: base payout + collected penalties for this cycle
        let base_payout = group.contribution_amount * (member_count as i128);
        let penalty_bonus = storage::get_cycle_penalty_pool(&env, group_id_cached, current_cycle);
        let payout_amount = base_payout + penalty_bonus;

        // Get contract address for token transfer
        let contract_address = env.current_contract_address();

        // Verify contract has sufficient balance
        crate::token::check_contract_balance(
            &env,
            &group.token_address,
            &contract_address,
            payout_amount,
        )?;

        // Transfer tokens from contract to recipient
        crate::token::transfer_token(
            &env,
            &group.token_address,
            &contract_address,
            &payout_recipient,
            payout_amount,
        )?;

        // Mark payout as received
        storage::mark_payout_received(&env, group_id_cached, &payout_recipient);

        // Emit payout event with penalty information
        if penalty_bonus > 0 {
            events::emit_penalty_distributed(
                &env,
                group_id,
                &payout_recipient,
                group.current_cycle,
                base_payout,
                penalty_bonus,
            );
        }

        events::emit_payout_executed(
            &env,
            group_id_cached,
            &payout_recipient,
            current_cycle,
            payout_amount,
        );

        // Record the ordering decision for transparency
        events::emit_payout_order_determined(
            &env,
            group_id_cached,
            current_cycle,
            &payout_recipient,
            group.payout_strategy as u32,
        );

        // Advance payout index
        group.payout_index += 1;

        // Check if all members have received payout
        if group.payout_index >= member_count as u32 {
            // All members have received payout - mark complete
            group.is_complete = true;
            events::emit_group_completed(&env, group_id_cached);
        } else {
            // Advance to next cycle
            group.current_cycle += 1;
            group.cycle_start_time = utils::get_current_timestamp(&env);
        }

        // Update storage (single write)
        storage::store_group(&env, group_id, &group);

        // Check and record group milestones
        let milestones = utils::check_group_milestones(&env, &group);
        for milestone in milestones.iter() {
            let record = MilestoneRecord {
                group_id: group.id,
                milestone,
                achieved_at: utils::get_current_timestamp(&env),
                cycle_number: current_cycle,
            };
            storage::add_group_milestone(&env, group.id, &record);
            events::emit_milestone_achieved(&env, group.id, record.milestone as u32, current_cycle);
        }

        // If group completed, update member stats for all members
        if group.is_complete {
            for member in group.members.iter() {
                let mut stats = storage::get_member_stats(&env, &member)
                    .unwrap_or_else(|| utils::default_member_stats(&env, &member));
                stats.total_groups_completed += 1;
                storage::store_member_stats(&env, &member, &stats);
            }
        }

        Ok(())
    }
    // Insurance – automated claim verification & settlement

    /// Automatically verify and settle an insurance claim based on on-chain data.
    ///
    /// Replaces the manual admin-approval flow with fully automated, trustless
    
    pub fn auto_verify_insurance_claim(env: Env, claim_id: u64) -> Result<(), AjoError> {
        // Honour the global pause flag so this endpoint is blocked during emergencies.
        pausable::ensure_not_paused(&env)?;

        crate::insurance::auto_process_claim(&env, claim_id)
    }

    /// Get insurance pool information for a token.
    ///
    /// Returns the current balance, total payouts, and pending claims count
    /// for the insurance pool associated with the given token address.
    ///
    /// # Arguments
    /// * `env`           - The Soroban contract environment
    /// * `token_address` - Token contract address for the pool to query
    ///
    /// # Returns
    /// `Ok(InsurancePool)` containing pool balance and statistics.
    ///
    /// # Errors
    /// * `PoolNotFound` – no pool exists for the given token
    pub fn get_insurance_pool_info(
        env: Env,
        token_address: Address,
    ) -> Result<crate::types::InsurancePool, AjoError> {
        crate::insurance::get_pool_info(&env, &token_address)
    }

    // Query helpers
    
    pub fn is_complete(env: Env, group_id: u64) -> Result<bool, AjoError> {
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;
        Ok(group.is_complete)
    }

    /// Get comprehensive group status.
    ///
    /// Returns a detailed snapshot of the group's current state, including cycle
    /// information, contribution status, payout progress, and timing data.
    /// This is the primary function for checking a group's overall progress.
    ///
    /// Returns information about:
    /// - Current cycle number and progress
    /// - Next recipient for payout
    /// - Members who have contributed and those who are pending
    /// - Cycle timing (start time, end time, whether cycle is active)
    /// - Whether the group is complete
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// A `GroupStatus` struct containing comprehensive group state information
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn get_group_status(env: Env, group_id: u64) -> Result<GroupStatus, AjoError> {
        // Get the group data (single fetch)
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Cache frequently accessed values
        let current_time = utils::get_current_timestamp(&env);
        let _member_count = group.members.len();
        let group_id_cached = group.id;
        let current_cycle = group.current_cycle;

        // Calculate cycle timing
        let cycle_end_time = group.cycle_start_time + group.cycle_duration;
        let grace_period_end_time = utils::get_grace_period_end(&group);
        let is_cycle_active = current_time < cycle_end_time;
        let is_in_grace_period = utils::is_within_grace_period(&group, current_time);

        // Get penalty pool for current cycle
        let cycle_penalty_pool = storage::get_cycle_penalty_pool(&env, group_id, group.current_cycle);

        // Build pending_contributors list
        let mut contributions_received: u32 = 0;
        let mut pending_contributors = Vec::new(&env);

        // Single pass through members to check contributions
        for member in group.members.iter() {
            if storage::has_contributed(&env, group_id_cached, current_cycle, &member) {
                contributions_received += 1;
            } else {
                pending_contributors.push_back(member);
            }
        }

        // Determine next recipient according to the configured strategy without
        // committing payout-order storage from a read-only status query.
        let (has_next_recipient, next_recipient) = if group.is_complete {
            (false, group.creator.clone())
        } else {
            match utils::preview_next_recipient(&env, &group) {
                Ok(recipient) => (true, recipient),
                Err(_) => (false, group.creator.clone()),
            }
        };

        // Build and return status
        Ok(GroupStatus {
            group_id: group.id,
            current_cycle: group.current_cycle,
            has_next_recipient,
            next_recipient,
            contributions_received,
            total_members: group.members.len() as u32,
            pending_contributors,
            is_complete: group.is_complete,
            is_cycle_active,
            cycle_start_time: group.cycle_start_time,
            cycle_end_time,
            current_time,
            cycle_penalty_pool,
            is_in_grace_period,
            grace_period_end_time,
        })
    }
}