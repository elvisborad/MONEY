import React, { useState } from 'react';
import { Sparkles, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { API_BASE } from '../config';

export default function LoginPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Client-side validations
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both a username and password.');
      return;
    }

    if (isRegister) {
      if (username.trim().length < 3) {
        setErrorMsg('Username must be at least 3 characters long.');
        return;
      }
      if (password.length < 4) {
        setErrorMsg('Password must be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      // Store credentials in localStorage
      localStorage.setItem('clearnote_token', data.token);
      localStorage.setItem('clearnote_username', data.username);

      if (isRegister) {
        setSuccessMsg('Account created successfully! Logging you in...');
        setTimeout(() => {
          onLoginSuccess(data.username, data.token);
        }, 1500);
      } else {
        onLoginSuccess(data.username, data.token);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg text-gray-100 p-4 relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(57,255,20,0.06)_0%,transparent_70%)] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(0,240,255,0.06)_0%,transparent_70%)] pointer-events-none z-0"></div>

      <div className="w-full max-w-md bg-dark-card/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl p-8 z-10 glass-panel">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green glow-border-green mb-3">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white font-mono">
            ClearNote <span className="text-neon-green">AI</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-bold">
            Banknote Authenticity Scanner
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-neutral-900/60 border border-neutral-800 mb-6">
          <button
            onClick={() => {
              setIsRegister(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all duration-300 cursor-pointer ${
              !isRegister
                ? 'bg-neon-green/10 border border-neon-green/20 text-neon-green shadow-inner font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsRegister(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all duration-300 cursor-pointer ${
              isRegister
                ? 'bg-neon-green/10 border border-neon-green/20 text-neon-green shadow-inner font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3.5 mb-5 rounded-xl bg-neon-green/10 border border-neon-green/20 text-neon-green text-xs font-semibold">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-400 mb-1.5 ml-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                <User size={15} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-neon-green/30 text-white pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all duration-300"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-400 mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-neon-green/30 text-white pl-10 pr-10 py-3 rounded-xl text-sm focus:outline-none transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Register mode only) */}
          {isRegister && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-400 mb-1.5 ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-neutral-950/60 border border-neutral-800 focus:border-neon-green/30 text-white pl-10 pr-10 py-3 rounded-xl text-sm focus:outline-none transition-all duration-300"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-neon-green text-black hover:bg-neon-green/90 font-bold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-neon-green/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : isRegister ? (
              'Create Free Account'
            ) : (
              'Sign In Securely'
            )}
          </button>
        </form>

        {/* Footnote Connection Status */}
        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-neutral-500">
          <span>Backend Target:</span>
          <span className="font-mono text-neutral-400">
            {API_BASE ? 'Production (Render)' : 'Local Host'}
          </span>
        </div>
      </div>
    </div>
  );
}
