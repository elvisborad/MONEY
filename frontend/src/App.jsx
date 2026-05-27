import React, { useState, useEffect } from 'react';
import { Home as HomeIcon, Camera, Upload, History as HistoryIcon, BarChart3, Settings as SettingsIcon, Menu, X, Sparkles, AlertCircle } from 'lucide-react';

// Import Page Components
import Home from './components/Home.jsx';
import DetectionPage from './components/DetectionPage.jsx';
import UploadPage from './components/UploadPage.jsx';
import HistoryPage from './components/HistoryPage.jsx';
import AnalyticsPage from './components/AnalyticsPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import LoginPage from './components/LoginPage.jsx';
import { API_BASE } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [user, setUser] = useState(null);

  // Check if API key is configured on the backend
  const checkSettingsStatus = async (authToken = null) => {
    const token = authToken || localStorage.getItem('moneyvision_token');
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setApiConfigured(data.api_key_configured);
      }
    } catch (err) {
      console.warn("Could not check settings configuration status:", err);
    }
  };

  const checkAuthStatus = async () => {
    const savedToken = localStorage.getItem('moneyvision_token');
    const savedUsername = localStorage.getItem('moneyvision_username');
    if (savedToken && savedUsername) {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        if (response.ok) {
          setUser({ username: savedUsername, token: savedToken });
          await checkSettingsStatus(savedToken);
        } else {
          handleLogout();
        }
      } catch (err) {
        console.warn("Auth check failed, using cached session offline:", err);
        setUser({ username: savedUsername, token: savedToken });
      } finally {
        setCheckingConfig(false);
      }
    } else {
      setCheckingConfig(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleLoginSuccess = (username, token) => {
    setUser({ username, token });
    checkSettingsStatus(token);
  };

  const handleLogout = async () => {
    const savedToken = localStorage.getItem('moneyvision_token');
    if (savedToken) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
      } catch (err) {
        console.warn("Logout request failed:", err);
      }
    }
    localStorage.removeItem('moneyvision_token');
    localStorage.removeItem('moneyvision_username');
    setUser(null);
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'detection', label: 'Camera Scanner', icon: Camera },
    { id: 'upload', label: 'Upload Scan', icon: Upload },
    { id: 'history', label: 'Scan History', icon: HistoryIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  if (checkingConfig) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center text-neon-green">
        <RefreshCw size={36} className="animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-dark-bg text-gray-100 flex-col md:flex-row relative">
      {/* Background Decorative Glow (Top Right) */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(0,240,255,0.06)_0%,transparent_70%)] pointer-events-none z-0"></div>

      {/* MOBILE HEADER NAVBAR */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 border-b border-white/5 bg-dark-card/90 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Sparkles className="text-neon-green glow-text-green animate-pulse" size={20} />
          <span className="font-black text-white text-lg tracking-wider font-mono">MONEYVISION <span className="text-neon-green">AI</span></span>
        </div>
        
        <div className="flex items-center gap-3">
          {!apiConfigured && !checkingConfig && (
            <div 
              onClick={() => handleTabChange('settings')}
              className="p-1 px-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <AlertCircle size={10} /> Key Required
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-lg border border-white/5 bg-white/5 cursor-pointer"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className={`fixed md:sticky top-0 bottom-0 left-0 w-64 border-r border-white/5 bg-dark-card/90 backdrop-blur-xl z-40 transition-transform duration-300 md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } h-screen flex flex-col justify-between p-6 shrink-0`}>
        
        <div className="space-y-8">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleTabChange('home')}>
            <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green glow-border-green">
              <Sparkles size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base tracking-wider font-mono">MONEYVISION <span className="text-neon-green">AI</span></span>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Currency Scanner</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-neon-green/10 border-neon-green/30 text-neon-green glow-border-green font-bold'
                      : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-neon-green' : 'text-neutral-400'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info & Connection Badge */}
        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-800/80">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-neon-green/10 border border-neon-green/25 flex items-center justify-center text-neon-green font-bold text-xs uppercase font-mono shrink-0">
                {user.username ? user.username[0] : 'U'}
              </div>
              <span className="text-xs text-neutral-300 font-bold truncate max-w-[100px]" title={user.username}>
                {user.username}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[10px] text-red-400 hover:text-red-300 font-extrabold uppercase tracking-wider px-2 py-1.5 rounded bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 transition-all duration-300 cursor-pointer"
            >
              Logout
            </button>
          </div>

          <div>
            {apiConfigured ? (
              <div className="flex items-center gap-2 text-xs text-neutral-400 font-semibold px-3 py-2 rounded-lg bg-neon-green/5 border border-neon-green/20">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
                Roboflow Connected
              </div>
            ) : (
              <div 
                onClick={() => handleTabChange('settings')}
                className="flex items-center gap-2 text-xs text-amber-500 font-bold px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 cursor-pointer hover:bg-amber-500/10 transition-all duration-300"
              >
                <AlertCircle size={14} className="shrink-0" />
                API Key Config Required
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen overflow-y-auto px-4 md:px-8 py-6 z-10">
        {/* Render pages */}
        {activeTab === 'home' && <Home setTab={handleTabChange} />}
        {activeTab === 'detection' && <DetectionPage apiConfigured={apiConfigured} />}
        {activeTab === 'upload' && <UploadPage apiConfigured={apiConfigured} />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'settings' && <SettingsPage fetchSettingsStatus={checkSettingsStatus} />}
      </main>
      
      {/* Mobile background overlay when drawer is open */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        ></div>
      )}
    </div>
  );
}
