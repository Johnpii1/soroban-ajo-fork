// Wallet type definitions for Freighter, Albedo, and Lobstr integration

export type WalletType = 'freighter' | 'albedo' | 'lobstr';

export interface WalletInfo {
    name: string;
    type: WalletType;
    icon?: string;
    isInstalled: boolean;
}

export interface WalletState {
    isConnected: boolean;
    address: string | null;
    walletType: WalletType | null;
    network: 'testnet' | 'mainnet' | 'futurenet';
    publicKey: string | null;
}

export interface WalletError {
    code: string;
    message: string;
    walletType?: WalletType;
}

export interface ConnectWalletParams {
    walletType: WalletType;
    network?: 'testnet' | 'mainnet' | 'futurenet';
}

export interface WalletConnectionResult {
    success: boolean;
    address?: string;
    publicKey?: string;
    error?: WalletError;
}

export type StellarNetwork = 'testnet' | 'mainnet' | 'futurenet';

export type FreighterNetworkDetails = {
    network?: string;
    [key: string]: unknown;
};

// Freighter API types (the injected `window.freighterApi` surface).
export interface FreighterApi {
    isAllowed?: () => Promise<boolean>;
    setAllowed?: () => Promise<void>;
    getPublicKey: () => Promise<string>;
    getNetworkDetails?: () => Promise<FreighterNetworkDetails>;
    signAuthEntry?: (entry: string) => Promise<string>;

    // Legacy/optional methods some builds expose.
    getNetwork?: () => Promise<string>;
    isConnected?: () => Promise<boolean>;
    signTransaction?: (xdr: string, opts?: { network?: string; networkPassphrase?: string }) => Promise<string>;
}

// Albedo API types
export interface AlbedoAPI {
    publicKey: (params: { require_existing?: boolean }) => Promise<{ pubkey: string; signed_message?: string }>;
    tx: (params: { xdr: string; network?: string; submit?: boolean }) => Promise<{ signed_envelope_xdr: string; tx_hash?: string }>;
    trust: (params: { asset_code: string; asset_issuer: string; limit?: string }) => Promise<{ pubkey: string }>;
}

// Lobstr Vault API types (browser extension)
export interface LobstrVaultAPI {
    getPublicKey: () => Promise<string>;
    signTransaction: (xdr: string, opts?: { network?: string }) => Promise<string>;
    isConnected?: () => Promise<boolean>;
    getNetwork?: () => Promise<string>;
}

// Regular LOBSTR wallet API (can be injected by desktop app or extension)
export interface LobstrAPI {
    getPublicKey: () => Promise<string>;
    signTransaction: (xdr: string, opts?: { network?: string }) => Promise<string>;
    isConnected?: () => Promise<boolean>;
    getNetwork?: () => Promise<string>;
}

declare global {
    interface Window {
        freighterApi?: FreighterApi;
        // Legacy: keep this for older codepaths/extensions.
        freighter?: FreighterApi;
        albedo?: AlbedoAPI;
        lobstrVault?: LobstrVaultAPI;
        lobstr?: LobstrAPI;
    }
}
