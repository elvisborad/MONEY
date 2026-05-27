import React from 'react';
import { Camera, Upload, ArrowRight, ShieldCheck, Cpu, Zap } from 'lucide-react';

export default function Home({ setTab }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 md:px-8 py-12 relative overflow-hidden">
      {/* Background Decorative Glow Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-green/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl text-center z-10">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border-neon-green/30 text-neon-green text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse glow-border-green">
          <Zap size={14} className="fill-neon-green" /> Powered by Roboflow Computer Vision
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
          Instant Currency <br />
          <span className="text-neon-green glow-text-green font-black">Detection & Counting</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Detect, classify, and count Indian Rupees in real time. ClearNote AI uses state-of-the-art serverless workflows to recognize ₹10 to ₹2000 notes instantly.
        </p>

        {/* Scanning Animation Area */}
        <div className="relative w-72 h-44 md:w-96 md:h-56 mx-auto mb-12 flex items-center justify-center rounded-2xl glass-panel-glow-green overflow-hidden animate-float">
          {/* Neon green grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(57,255,20,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(57,255,20,0.05)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          {/* Note Representation */}
          <div className="w-56 h-28 md:w-72 md:h-36 bg-gradient-to-br from-emerald-950 to-neutral-900 border border-emerald-500/40 rounded-lg flex flex-col justify-between p-3 relative z-10 shadow-2xl">
            <div className="flex justify-between items-start">
              <span className="text-emerald-400 font-bold text-lg md:text-xl">₹500</span>
              <div className="w-8 h-8 rounded-full border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 font-serif">RBI</div>
            </div>
            <div className="flex justify-center my-1">
              <span className="text-neutral-500 text-[10px] tracking-widest font-mono">CLEARNOTE AI</span>
            </div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[8px] text-neutral-500 font-mono">SPECIMEN</span>
                <span className="text-[8px] text-emerald-500 font-bold">RESERVE BANK OF INDIA</span>
              </div>
              <span className="text-emerald-400 font-bold text-lg md:text-xl">₹500</span>
            </div>
          </div>

          {/* Animated Green Scan Line */}
          <div className="absolute left-0 right-0 h-1 bg-neon-green shadow-[0_0_15px_#39ff14] animate-scan-line z-20"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-green/5 to-transparent pointer-events-none"></div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => setTab('detection')}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-neon-green hover:bg-neon-green/90 text-black font-bold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_30px_rgba(57,255,20,0.5)] transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Camera size={20} />
            Start Live Camera Scan
            <ArrowRight size={18} />
          </button>
          
          <button
            onClick={() => setTab('upload')}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 glass-panel border-neutral-800 hover:border-neon-blue/50 text-white hover:text-neon-blue font-bold rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Upload size={20} />
            Upload Image Scan
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="p-6 rounded-xl glass-panel border-neutral-800/80">
            <div className="w-12 h-12 rounded-lg bg-neon-green/10 flex items-center justify-center text-neon-green mb-4">
              <Cpu size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Roboflow Serverless Workflows</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Utilizes high-performance neural network workflows to segment and label currency notes at GPU-medium scale.
            </p>
          </div>

          <div className="p-6 rounded-xl glass-panel border-neutral-800/80">
            <div className="w-12 h-12 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Secure API Management</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              API credentials are kept strictly server-side in Python environment configurations, securing your tokens from client leakage.
            </p>
          </div>

          <div className="p-6 rounded-xl glass-panel border-neutral-800/80">
            <div className="w-12 h-12 rounded-lg bg-neon-green/10 flex items-center justify-center text-neon-green mb-4">
              <Camera size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">E2E Browser Capture</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Streams video frames directly from the browser context to the server, supporting fully responsive scans on both desktop and mobile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
