// File: src/app/login/page.tsx
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      // Redirect paksa agar middleware merespon
      window.location.href = '/'; 
    } else {
      setError('ACCESS DENIED: Invalid Credentials');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-red-500 selection:text-white">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-[#111] border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10">
        
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(79,70,229,0.5)]">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SENTINEL <span className="text-indigo-500">ACCESS</span></h1>
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Restricted Area • Authorized Personnel Only</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">OPERATOR ID</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-700"
              placeholder="admin"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">PASSPHRASE</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-700"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-500/20 rounded text-red-400 text-xs font-bold text-center animate-pulse">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'AUTHENTICATING...' : 'INITIATE SESSION'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-slate-600">
            System secured by <span className="text-slate-500 font-bold">Sentinel Gatekeeper Protocol</span>
          </p>
        </div>
      </div>
    </div>
  );
}