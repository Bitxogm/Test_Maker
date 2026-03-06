"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, removeToken, isAuthenticated } from '@/lib/auth';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUser());
    }
  }, []);

  const handleLogout = () => {
    removeToken();
    setUser(null);
    router.push('/login');
  };

  return (
    <header className="h-[60px] flex items-center justify-between px-6 bg-dark-800 border-b border-dark-700">
      <div className="flex items-center space-x-3">
        <h1 className="text-xl font-black text-neon-cyan glow-cyan tracking-tighter">
          TESTLAB AI
        </h1>
        <span className="bg-neon-purple/20 text-neon-purple text-[10px] font-bold px-2 py-0.5 border border-neon-purple/50 rounded shadow-[0_0_5px_rgba(191,0,255,0.3)]">
          BETA
        </span>
      </div>

      <div className="flex items-center space-x-6">
        {user ? (
          <>
            <span className="text-sm font-mono text-gray-400">
              {user.email || user.sub}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 border border-neon-pink text-neon-pink text-xs font-bold tracking-widest hover:bg-neon-pink/10 transition-all uppercase"
            >
              LOGOUT
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-1.5 border border-neon-cyan text-neon-cyan text-xs font-bold tracking-widest hover:bg-neon-cyan/10 hover:glow-cyan transition-all uppercase"
          >
            LOGIN
          </button>
        )}
      </div>
    </header>
  );
}
