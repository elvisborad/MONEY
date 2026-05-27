import React, { useState, useEffect } from 'react';
import { Shield, Sliders, Globe, Camera, Save, RefreshCw, CheckCircle, AlertCircle, Volume2, Play } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config';

export default function SettingsPage({ fetchSettingsStatus }) {
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [region, setRegion] = useState('us');
  const [threshold, setThreshold] = useState(0.5);
  
  // Camera selection
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Audio state
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceVoiceName, setVoiceVoiceName] = useState('');
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [systemVoices, setSystemVoices] = useState([]);

  // Counterfeit validation state
  const [counterfeitCheckEnabled, setCounterfeitCheckEnabled] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setMaskedKey(data.api_key_masked || '');
        setRegion(data.region || 'us');
        setThreshold(data.threshold || 0.5);
        setVoiceEnabled(data.voice_enabled ?? true);
        setVoiceRate(data.voice_rate ?? 1.0);
        setVoicePitch(data.voice_pitch ?? 1.0);
        setVoiceVoiceName(data.voice_voice_name || '');
        setChimeEnabled(data.chime_enabled ?? true);
        setCounterfeitCheckEnabled(data.counterfeit_check_enabled ?? true);
        // If API key is already configured, show a placeholder
        if (data.api_key_configured) {
          setApiKey(data.api_key_masked || 'Configured');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCameraDevices = async () => {
    try {
      // Prompt permissions first to get device names
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      
      // Load saved camera selection from localStorage if exists
      const savedCam = localStorage.getItem('clearnote_camera_id');
      if (savedCam && videoDevices.some(d => d.deviceId === savedCam)) {
        setSelectedCamera(savedCam);
      } else if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn("Could not enumerate camera devices:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
    getCameraDevices();
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        setSystemVoices(voices);
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const testVoiceConfiguration = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert("Text-to-speech is not supported on your browser.");
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const sampleText = "ClearNote AI audio configuration test. Two notes of 500 rupees detected.";
    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    
    if (voiceVoiceName) {
      const selected = systemVoices.find(v => v.name === voiceVoiceName);
      if (selected) {
        utterance.voice = selected;
      }
    }
    
    window.speechSynthesis.speak(utterance);
    
    // Play a sample chime if chime is enabled
    if (chimeEnabled) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          const now = ctx.currentTime;
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
          osc.frequency.setValueAtTime(1174.66, now + 0.16); // D6
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
        }
      } catch (err) {
        console.warn("Chime test failed:", err);
      }
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        region,
        threshold,
        voice_enabled: voiceEnabled,
        voice_rate: voiceRate,
        voice_pitch: voicePitch,
        voice_voice_name: voiceVoiceName,
        chime_enabled: chimeEnabled,
        counterfeit_check_enabled: counterfeitCheckEnabled
      };
      
      // Only send API Key if it's changed from the placeholder
      if (apiKey && apiKey !== maskedKey && apiKey !== 'Configured' && !apiKey.includes('...')) {
        payload.api_key = apiKey;
      }

      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Save camera selection to localStorage
        if (selectedCamera) {
          localStorage.setItem('clearnote_camera_id', selectedCamera);
        }

        setSuccessMsg('Settings updated and stored securely on the server!');
        fetchSettings(); // refresh display
        if (fetchSettingsStatus) {
          fetchSettingsStatus(); // notify parent
        }
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save settings');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-neon-green glow-border-green animate-pulse"></span>
          Application Settings
        </h2>
        <p className="text-neutral-400 mt-1">Configure Roboflow AI settings, region servers, thresholds, and camera devices.</p>
      </div>

      {successMsg && (
        <div className="p-4 mb-6 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 flex items-start gap-3">
          <CheckCircle className="shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 mb-6 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={saveSettings} className="space-y-6">
        
        {/* Security & API Key */}
        <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-950/20 glass-panel space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-neon-green" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Security & AI Key</h3>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-400">Roboflow Private API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. rf_xxxxxx"
              className="glass-input w-full font-mono text-sm"
            />
            <p className="text-[10px] text-neutral-500">
              Your API key is securely transmitted to the backend Flask environment and never exposed to public repositories.
            </p>
          </div>
        </div>

        {/* Model Configurations */}
        <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-950/20 glass-panel space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Sliders size={18} className="text-neon-blue" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Inference Configurations</h3>
          </div>
          
          {/* Threshold Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <label className="text-neutral-400">Detection Confidence Threshold</label>
              <span className="text-neon-blue font-mono text-sm">{Math.round(threshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neon-blue focus:outline-none"
            />
            <p className="text-[10px] text-neutral-500">
              Adjust how confident the neural network must be to label a bill. Default is 50%.
            </p>
          </div>

          {/* Region dropdown */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400">
              <Globe size={14} />
              <label>Roboflow Server Region</label>
            </div>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="glass-input w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2.5 px-3 focus:outline-none focus:border-neon-green"
            >
              <option value="us">United States API (hosted: detect.roboflow.com)</option>
              <option value="eu">Europe Region API</option>
              <option value="ap">Asia-Pacific Region API</option>
              <option value="serverless">Serverless Edge GPU (hosted: serverless.roboflow.com)</option>
            </select>
          </div>

          {/* Counterfeit Check Toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-800/60 bg-neutral-900/40 hover:bg-neutral-900/60 cursor-pointer transition-all duration-300">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Automated Counterfeit Check</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Run HSV color & aspect ratio checks on banknotes</span>
            </div>
            <input
              type="checkbox"
              checked={counterfeitCheckEnabled}
              onChange={(e) => setCounterfeitCheckEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-neon-blue accent-neon-blue bg-neutral-950 border-neutral-800 focus:ring-0 cursor-pointer"
            />
          </label>
        </div>

        {/* Audio Announcements */}
        <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-950/20 glass-panel space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4 mb-2">
            <div className="flex items-center gap-2">
              <Volume2 size={18} className="text-purple-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Audio Configurations</h3>
            </div>
            
            <button
              type="button"
              onClick={testVoiceConfiguration}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 text-xs font-bold transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
            >
              <Play size={12} className="fill-purple-400/20" />
              Test Audio Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Toggles */}
            <div className="flex flex-col gap-4 justify-center">
              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-800/60 bg-neutral-900/40 hover:bg-neutral-900/60 cursor-pointer transition-all duration-300">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Announce Banknotes (TTS)</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">Read note denominations & total amount aloud</span>
                </div>
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-neon-green accent-neon-green bg-neutral-950 border-neutral-800 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-800/60 bg-neutral-900/40 hover:bg-neutral-900/60 cursor-pointer transition-all duration-300">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Chime Sound Effects</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">Play synth chime when cash count updates</span>
                </div>
                <input
                  type="checkbox"
                  checked={chimeEnabled}
                  onChange={(e) => setChimeEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-neon-green accent-neon-green bg-neutral-950 border-neutral-800 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>

            {/* Voice Dropdown */}
            <div className="flex flex-col gap-1.5 justify-center">
              <label className="text-xs font-bold text-neutral-400">Select Announcement Voice</label>
              <select
                value={voiceVoiceName}
                onChange={(e) => setVoiceVoiceName(e.target.value)}
                disabled={!voiceEnabled}
                className="glass-input w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2.5 px-3 focus:outline-none focus:border-neon-green disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Browser Default Narrator</option>
                {systemVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              <p className="text-[9px] text-neutral-500">
                Speech voices are loaded directly from your device's operating system speech library.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-neutral-800/40 pt-4">
            {/* Speed Rate Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <label className="text-neutral-400">Voice Announcement Speed (Rate)</label>
                <span className="text-purple-400 font-mono text-sm">{voiceRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceRate}
                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                disabled={!voiceEnabled}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[10px] text-neutral-500">
                Adjust the speech speed. Standard speed is 1.0x.
              </p>
            </div>

            {/* Pitch Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <label className="text-neutral-400">Voice Pitch (Tone)</label>
                <span className="text-purple-400 font-mono text-sm">{voicePitch.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voicePitch}
                onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                disabled={!voiceEnabled}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[10px] text-neutral-500">
                Adjust how high or deep the voice sounds. Standard is 1.0.
              </p>
            </div>
          </div>
        </div>

        {/* Camera device settings */}
        <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-950/20 glass-panel space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Camera size={18} className="text-purple-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Device Input Selection</h3>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-400">Webcam Camera Input</label>
            {cameras.length === 0 ? (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-500 font-semibold leading-relaxed">
                No external cameras enumerated yet. Click "Start Webcam Feed" on the Camera tab to authorize webcam access, or verify your browser permissions.
              </div>
            ) : (
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="glass-input w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2.5 px-3 focus:outline-none focus:border-neon-green"
              >
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Camera Device ${cam.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-neon-green hover:bg-neon-green/90 text-black font-extrabold rounded-xl transition-all duration-300 glow-border-green shadow-[0_0_20px_rgba(57,255,20,0.2)] transform active:scale-95 cursor-pointer"
        >
          {loading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
          Save Configurations
        </button>
        
      </form>
    </div>
  );
}
