'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AuthModal from './AuthModal'

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
  }

  const handleAuthSuccess = () => {
    // User logged in successfully, modal will close automatically
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="text-sm bg-slate-600 text-white rounded-md px-4 py-2 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
        >
          Sign In
        </button>
        
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm bg-white border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline text-gray-700">{user.name}</span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                {user.email}
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}