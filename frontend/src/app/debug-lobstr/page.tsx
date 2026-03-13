'use client';

import { useState, useEffect } from 'react';

export default function DebugLobstrPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check what's available in the window object
    const info: any = {
      hasWindow: typeof window !== 'undefined',
      hasLobstrVault: typeof window !== 'undefined' && !!(window as any).lobstrVault,
      hasLobstr: typeof window !== 'undefined' && !!(window as any).lobstr,
      hasFreighter: typeof window !== 'undefined' && !!(window as any).freighterApi,
      hasAlbedo: typeof window !== 'undefined' && !!(window as any).albedo,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        typeof navigator !== 'undefined' ? navigator.userAgent : ''
      ),
    };

    // Check for Lobstr Vault methods
    if (info.hasLobstrVault) {
      const vault = (window as any).lobstrVault;
      info.lobstrVaultMethods = Object.keys(vault).filter(key => typeof vault[key] === 'function');
    }

    // Check for regular LOBSTR methods
    if (info.hasLobstr) {
      const lobstr = (window as any).lobstr;
      info.lobstrMethods = Object.keys(lobstr).filter(key => typeof lobstr[key] === 'function');
    }

    setDebugInfo(info);
  }, []);

  const testLobstrConnection = async () => {
    setIsLoading(true);
    setTestResult('Testing...');

    try {
      if (typeof window === 'undefined') {
        setTestResult('❌ Window object not available');
        return;
      }

      const lobstrVault = (window as any).lobstrVault;
      const lobstr = (window as any).lobstr;
      const wallet = lobstrVault || lobstr;

      if (!wallet) {
        setTestResult('❌ LOBSTR wallet not detected.\n\nPlease install:\n• LOBSTR mobile/desktop app, OR\n• Lobstr Vault browser extension\n\nThen refresh this page.');
        return;
      }

      const walletType = lobstrVault ? 'Lobstr Vault' : 'LOBSTR Wallet';
      setTestResult(`✅ ${walletType} detected! Attempting to get public key...`);

      // Try to get public key
      const publicKey = await wallet.getPublicKey();

      if (publicKey) {
        setTestResult(`✅ Success! Connected to ${walletType}\n\nPublic Key: ${publicKey}\n\nYou can now use LOBSTR with Ajo!`);
      } else {
        setTestResult(`❌ Failed to get public key from ${walletType}. Please make sure you have set up your account.`);
      }
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message || 'Unknown error'}\n\nPlease make sure:\n1. Lobstr Vault extension is installed\n2. You have created a vault account\n3. You have approved the connection request`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Lobstr Wallet Debug Console
        </h1>

        {/* Debug Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            System Information
          </h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Window Available:</span>
              <span className={debugInfo.hasWindow ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.hasWindow ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Lobstr Vault Detected:</span>
              <span className={debugInfo.hasLobstrVault ? 'text-green-600' : 'text-gray-400'}>
                {debugInfo.hasLobstrVault ? '✅ Yes' : '⚪ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">LOBSTR Wallet Detected:</span>
              <span className={debugInfo.hasLobstr ? 'text-green-600' : 'text-gray-400'}>
                {debugInfo.hasLobstr ? '✅ Yes' : '⚪ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Freighter Detected:</span>
              <span className={debugInfo.hasFreighter ? 'text-green-600' : 'text-gray-400'}>
                {debugInfo.hasFreighter ? '✅ Yes' : '⚪ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Albedo Detected:</span>
              <span className={debugInfo.hasAlbedo ? 'text-green-600' : 'text-gray-400'}>
                {debugInfo.hasAlbedo ? '✅ Yes' : '⚪ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Mobile Device:</span>
              <span className="text-gray-900 dark:text-white">
                {debugInfo.isMobile ? '📱 Yes' : '💻 No'}
              </span>
            </div>
          </div>

          {debugInfo.lobstrVaultMethods && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Available Lobstr Vault Methods:
              </h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs font-mono">
                {debugInfo.lobstrVaultMethods.join(', ')}
              </div>
            </div>
          )}

          {debugInfo.lobstrMethods && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Available LOBSTR Wallet Methods:
              </h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs font-mono">
                {debugInfo.lobstrMethods.join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Test Connection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Lobstr Connection
          </h2>
          <button
            onClick={testLobstrConnection}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? 'Testing...' : 'Test Lobstr Vault Connection'}
          </button>

          {testResult && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap text-gray-900 dark:text-white">
                {testResult}
              </pre>
            </div>
          )}
        </div>

        {/* Installation Guide */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Lobstr Installation Guide
          </h2>
          
          <div className="space-y-4 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <h3 className="font-semibold mb-2">For Desktop Users:</h3>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Install the Lobstr Vault extension from the <a href="https://vault.lobstr.co/" target="_blank" rel="noopener noreferrer" className="underline">Chrome Web Store</a></li>
                <li>Click the extension icon and create a new vault account</li>
                <li>Set up your security (password, 2FA, etc.)</li>
                <li>Return to this page and click "Test Lobstr Vault Connection"</li>
                <li>Approve the connection request in the Lobstr Vault popup</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-2">For Mobile Users:</h3>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Download Lobstr app from <a href="https://apps.apple.com/app/lobstr-stellar-lumens-wallet/id1404357892" target="_blank" rel="noopener noreferrer" className="underline">App Store</a> or <a href="https://play.google.com/store/apps/details?id=com.lobstr.client" target="_blank" rel="noopener noreferrer" className="underline">Google Play</a></li>
                <li>Create or import your Stellar account</li>
                <li>Visit Ajo on your mobile browser</li>
                <li>Use the "Connect Wallet" button (mobile deep-link flow)</li>
              </ol>
            </div>

            <div className="pt-4 border-t border-blue-200 dark:border-blue-700">
              <p className="font-semibold">Note:</p>
              <p>Lobstr Vault is a browser extension for desktop. The mobile Lobstr app uses a different connection method (deep-links). Make sure you're using the right version for your device.</p>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
            Troubleshooting
          </h2>
          <div className="space-y-3 text-sm text-yellow-800 dark:text-yellow-200">
            <div>
              <strong>❌ "Lobstr Vault not detected"</strong>
              <p className="ml-4">→ Install the Lobstr Vault extension and refresh this page</p>
            </div>
            <div>
              <strong>❌ "Failed to get public key"</strong>
              <p className="ml-4">→ Make sure you've created a vault account in the extension</p>
            </div>
            <div>
              <strong>❌ "Connection denied"</strong>
              <p className="ml-4">→ Click "Approve" in the Lobstr Vault popup when prompted</p>
            </div>
            <div>
              <strong>💡 Alternative</strong>
              <p className="ml-4">→ Use Freighter wallet instead (fully supported and tested)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
