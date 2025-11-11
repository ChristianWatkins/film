'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';

type DarkModeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const STORAGE_KEY = 'film-app-dark-mode';

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const toggleRef = useRef<() => void>();

  // Load dark mode preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      const darkMode = saved === 'true';
      setIsDarkMode(darkMode);
      setIsHydrated(true);
      
      // Apply dark mode class to html element immediately
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Update dark mode class when state changes
  useEffect(() => {
    if (!isHydrated) {
      console.log('[DarkMode] Not hydrated, skipping class update');
      return;
    }
    
    console.log('[DarkMode] Updating dark class, isDarkMode:', isDarkMode);
    const html = document.documentElement;
    const hadDark = html.classList.contains('dark');
    
    if (isDarkMode) {
      if (!hadDark) {
        html.classList.add('dark');
        console.log('[DarkMode] Added dark class to html element');
      } else {
        console.log('[DarkMode] Dark class already present');
      }
    } else {
      if (hadDark) {
        html.classList.remove('dark');
        console.log('[DarkMode] Removed dark class from html element');
      } else {
        console.log('[DarkMode] Dark class already removed');
      }
    }
    console.log('[DarkMode] HTML classes after update:', html.className);
    console.log('[DarkMode] HTML element:', html);
    
    // Force a reflow to ensure styles are applied
    void html.offsetHeight;
  }, [isDarkMode, isHydrated]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      console.log('[DarkMode] toggleDarkMode called, toggling from', prev, 'to', newMode);
      
      // Apply class immediately, before React re-renders
      const html = document.documentElement;
      if (newMode) {
        html.classList.add('dark');
        console.log('[DarkMode] Added dark class immediately');
      } else {
        html.classList.remove('dark');
        console.log('[DarkMode] Removed dark class immediately');
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(newMode));
        console.log('[DarkMode] Saved to localStorage:', newMode);
      }
      
      return newMode;
    });
  };

  // Store toggle function in ref so it's stable
  toggleRef.current = toggleDarkMode;

  // Global keyboard handler for "d" key
  useEffect(() => {
    if (!isHydrated) {
      console.log('[DarkMode] Not hydrated yet, skipping handler setup');
      return;
    }

    console.log('[DarkMode] Setting up keyboard handler');

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        e.stopPropagation();
        
        if (toggleRef.current) {
          toggleRef.current();
        }
      }
    };

    // Attach to window to match other keyboard handlers, use capture phase to catch early
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isHydrated]);

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}

