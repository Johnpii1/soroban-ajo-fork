// Issue #20: Global layout shell - Header component
// Complexity: Trivial (100 pts)

import React from 'react'
import { WalletConnector } from './WalletConnector'

interface HeaderProps {
  onNavigate?: (view: string) => void
  currentView?: string
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'create', label: 'Create Group' },
    { id: 'analytics', label: 'Analytics' },
  ]

  return (
    <header className="bg-white dark:bg-dark-bg-secondary shadow sticky top-0 z-50 border-b border-gray-200 dark:border-dark-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-2xl font-bold text-blue-600 dark:text-indigo-400">🪙 Soroban Ajo</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400 hidden sm:block">Decentralized Rotational Savings</p>
            </div>
            <div className="hidden md:flex gap-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    currentView === item.id
                      ? 'text-blue-600 dark:text-indigo-400 bg-blue-50 dark:bg-indigo-900/30'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <WalletConnector />
        </div>
      </nav>
    </header>
  )
}
