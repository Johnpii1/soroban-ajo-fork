/**
 * Lobstr Wallet Integration
 * 
 * Lobstr uses a deep-link based approach for wallet connections.
 * This utility provides functions to connect and interact with Lobstr wallet.
 */

import type { StellarNetwork } from '../types/auth'

export interface LobstrConnectionResult {
  address: string
  network: StellarNetwork
}

/**
 * Checks if the user is on a mobile device where Lobstr app can be opened
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Generates a Lobstr deep link for authentication
 * @param callbackUrl - URL to redirect back to after authentication
 */
export function generateLobstrDeepLink(callbackUrl: string): string {
  const encodedCallback = encodeURIComponent(callbackUrl)
  return `lobstr://auth?callback=${encodedCallback}`
}

/**
 * Opens Lobstr wallet for authentication
 * On mobile: Opens the Lobstr app
 * On desktop: Shows instructions to use Lobstr mobile app
 */
export async function connectLobstrWallet(): Promise<LobstrConnectionResult> {
  return new Promise((resolve, reject) => {
    if (isMobileDevice()) {
      // Mobile: Use deep link to open Lobstr app
      const callbackUrl = `${window.location.origin}/auth/lobstr-callback`
      const deepLink = generateLobstrDeepLink(callbackUrl)
      
      // Store a pending connection state
      sessionStorage.setItem('lobstr_auth_pending', 'true')
      sessionStorage.setItem('lobstr_auth_timestamp', Date.now().toString())
      
      // Open Lobstr app
      window.location.href = deepLink
      
      // Set a timeout in case user doesn't complete the flow
      setTimeout(() => {
        const pending = sessionStorage.getItem('lobstr_auth_pending')
        if (pending === 'true') {
          sessionStorage.removeItem('lobstr_auth_pending')
          sessionStorage.removeItem('lobstr_auth_timestamp')
          reject(new Error('Lobstr authentication timed out'))
        }
      }, 60000) // 1 minute timeout
    } else {
      // Desktop: Show QR code or instructions
      reject(new Error(
        'Lobstr wallet is a mobile app. Please use the Lobstr mobile app to scan a QR code or use Freighter wallet on desktop.'
      ))
    }
  })
}

/**
 * Handles the callback from Lobstr wallet
 * This should be called on the callback page
 */
export function handleLobstrCallback(): LobstrConnectionResult | null {
  if (typeof window === 'undefined') return null
  
  const params = new URLSearchParams(window.location.search)
  const address = params.get('address')
  const network = params.get('network') as StellarNetwork | null
  
  if (!address) return null
  
  // Clear pending state
  sessionStorage.removeItem('lobstr_auth_pending')
  sessionStorage.removeItem('lobstr_auth_timestamp')
  
  return {
    address,
    network: network || 'testnet',
  }
}

/**
 * Alternative: Use Lobstr Vault for desktop users OR regular LOBSTR wallet
 * Lobstr Vault is a browser extension similar to Freighter
 * Regular LOBSTR can also inject a wallet API
 */
export async function connectLobstrVault(): Promise<LobstrConnectionResult> {
  // Check if Lobstr Vault extension is installed
  const lobstrVault = (window as any).lobstrVault
  // Check if regular LOBSTR wallet is installed
  const lobstr = (window as any).lobstr
  
  const wallet = lobstrVault || lobstr
  
  if (!wallet) {
    throw new Error(
      'LOBSTR wallet not found. Please install LOBSTR app, Lobstr Vault extension, or use Freighter wallet.'
    )
  }
  
  try {
    // Request public key from LOBSTR wallet
    const address = await wallet.getPublicKey()
    
    if (!address) {
      throw new Error('Failed to get address from LOBSTR wallet')
    }
    
    // Get network (LOBSTR typically uses mainnet, but can be configured)
    let network: StellarNetwork = 'mainnet'
    
    // Try to get network details if available
    if (wallet.getNetwork) {
      try {
        const networkName = await wallet.getNetwork()
        if (networkName && networkName.toLowerCase().includes('test')) {
          network = 'testnet'
        }
      } catch {
        // Ignore network detection errors, use default
      }
    }
    
    return { address, network }
  } catch (error) {
    throw new Error(
      `LOBSTR wallet connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Sign a transaction with Lobstr
 * @param xdr - Transaction XDR to sign
 */
export async function signWithLobstr(xdr: string): Promise<string> {
  if (isMobileDevice()) {
    // Mobile: Use deep link
    const callbackUrl = `${window.location.origin}/auth/lobstr-sign-callback`
    const deepLink = `lobstr://sign?xdr=${encodeURIComponent(xdr)}&callback=${encodeURIComponent(callbackUrl)}`
    
    return new Promise((resolve, reject) => {
      sessionStorage.setItem('lobstr_sign_pending', xdr)
      window.location.href = deepLink
      
      setTimeout(() => {
        const pending = sessionStorage.getItem('lobstr_sign_pending')
        if (pending) {
          sessionStorage.removeItem('lobstr_sign_pending')
          reject(new Error('Lobstr signing timed out'))
        }
      }, 60000)
    })
  } else {
    // Desktop: Use Lobstr Vault
    const lobstrVault = (window as any).lobstrVault
    
    if (!lobstrVault) {
      throw new Error('Lobstr Vault extension not found')
    }
    
    try {
      const signedXdr = await lobstrVault.signTransaction(xdr)
      return signedXdr
    } catch (error) {
      throw new Error(
        `Failed to sign with Lobstr Vault: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

/**
 * Validates a Stellar public key format
 */
export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address)
}
