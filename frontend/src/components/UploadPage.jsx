import React, { useState, useRef } from 'react';
import { Upload, X, Download, Save, RefreshCw, AlertCircle, FileImage, ShieldAlert, CheckCircle2, XCircle, Info, Check } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config';

const RBI_SECURITY_MARKERS = {
  "₹10": [
    "See-through register with denominational numeral 10.",
    "Denominational numeral 10 in Devnagari script.",
    "Portrait of Mahatma Gandhi at the centre.",
    "Windowed demetalised security thread with inscriptions 'भारत' and RBI.",
    "Ashoka Pillar emblem on the right."
  ],
  "₹20": [
    "See-through register with denominational numeral 20.",
    "Denominational numeral 20 in Devnagari script.",
    "Portrait of Mahatma Gandhi at the centre.",
    "Windowed demetalised security thread with inscriptions 'भारत' and RBI.",
    "Ashoka Pillar emblem on the right."
  ],
  "₹50": [
    "See-through register with denominational numeral 50.",
    "Denominational numeral 50 in Devnagari script.",
    "Portrait of Mahatma Gandhi at the centre.",
    "Windowed demetalised security thread with inscriptions 'भारत' and RBI.",
    "Ashoka Pillar emblem on the right."
  ],
  "₹100": [
    "See-through register with denominational numeral 100.",
    "Latent image with denominational numeral 100.",
    "Portrait of Mahatma Gandhi at the centre.",
    "Windowed demetalised security thread with inscriptions 'भारत' and RBI, with color shift (green to blue).",
    "Raised printing (intaglio) Ashoka Pillar emblem, Mahatma Gandhi portrait, and triangular identification mark."
  ],
  "₹200": [
    "See-through register with denominational numeral 200.",
    "Latent image with denominational numeral 200.",
    "Portrait of Mahatma Gandhi at the centre.",
    "Windowed security thread with color shift from green to blue when tilted.",
    "Raised printing (intaglio) Ashoka Pillar emblem, and H-shaped identification mark with micro-text."
  ],
  "₹500": [
    "See-through register with denominational numeral 500.",
    "Latent image with denominational numeral 500.",
    "Portrait of Mahatma Gandhi at the centre.",
    "Windowed security thread shifts color from green to blue when tilted.",
    "Raised printing (intaglio) of Ashoka Pillar emblem, Mahatma Gandhi portrait, and circle identification mark."
  ],
  "₹2000": [
    "See-through register with denominational numeral 2000.",
    "Latent image with denominational numeral 2000.",
    "Portrait of Mahatma Gandhi at the centre.",
    "Windowed security thread shifts color from green to blue when tilted.",
    "Raised printing (intaglio) Ashoka Pillar emblem, and rectangle identification mark."
  ]
};

export default function UploadPage({ apiConfigured }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Results
  const [results, setResults] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100%
  const isDragging = useRef(false);
  const sliderContainerRef = useRef(null);

  // Manual verification states
  const [selectedNoteForVerification, setSelectedNoteForVerification] = useState(null);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(-1);
  const [verificationChecklist, setVerificationChecklist] = useState({});
  const [, setRenderTrigger] = useState(0);
  
  const forceUpdate = () => setRenderTrigger(v => v + 1);

  // Counterfeit validation state
  const [counterfeitCheckEnabled, setCounterfeitCheckEnabled] = useState(true);

  React.useEffect(() => {
    const loadDefaultSetting = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/settings`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          setCounterfeitCheckEnabled(data.counterfeit_check_enabled ?? true);
        }
      } catch (err) {
        console.warn("Could not load counterfeit setting:", err);
      }
    };
    loadDefaultSetting();
  }, []);

  const openVerificationModal = (note, index) => {
    setSelectedNoteForVerification(note);
    setSelectedNoteIndex(index);
    setVerificationChecklist(note.verification_checks || {});
  };

  const toggleVerificationCheck = (markerIndex) => {
    setVerificationChecklist(prev => {
      const next = { ...prev, [markerIndex]: !prev[markerIndex] };
      if (results && results.predictions[selectedNoteIndex]) {
        results.predictions[selectedNoteIndex].verification_checks = next;
      }
      return next;
    });
  };

  const setNoteVerificationStatus = (status) => {
    if (results && results.predictions[selectedNoteIndex]) {
      results.predictions[selectedNoteIndex].authenticity_status = status;
      setSelectedNoteForVerification(prev => ({
        ...prev,
        authenticity_status: status
      }));
      forceUpdate();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }
    
    setError('');
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setResults(null);
  };

  const playSiren = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      const now = ctx.currentTime;
      
      // Siren frequency sweep over 3 seconds (sweeps back and forth)
      osc.frequency.setValueAtTime(600, now);
      for (let t = 0; t < 3.0; t += 0.5) {
        osc.frequency.linearRampToValueAtTime(1100, now + t + 0.25);
        osc.frequency.linearRampToValueAtTime(600, now + t + 0.5);
      }
      
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.setValueAtTime(0.18, now + 2.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
      
      osc.start(now);
      osc.stop(now + 3.0);
    } catch (err) {
      console.warn("Siren failed to play:", err);
    }
  };

  const triggerUpload = async () => {
    if (!file) return;
    if (!apiConfigured) {
      setError('Roboflow API Key is not configured. Please add it in the Settings tab.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('counterfeit_check', counterfeitCheckEnabled ? '1' : '0');
      
      const response = await fetch(`${API_BASE}/api/detect-image`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error running detection');
      }
      
      const data = await response.json();
      setResults(data);
      setSliderPosition(100); // Default to showing the detection scan fully when loaded
      
      const hasFake = data.predictions.some(p => p.authenticity_status === 'counterfeit' || p.authenticity_status === 'suspicious');
      if (hasFake) {
        playSiren();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to analyze currency. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setFile(null);
    setPreviewUrl('');
    setResults(null);
    setError('');
  };

  const downloadResult = () => {
    if (!results || !results.annotated_image) return;
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${results.annotated_image}`;
    link.download = `moneyvision_detect_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveToHistory = async () => {
    if (!results) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/history`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          total_amount: results.total_value,
          predictions: results.predictions,
          counts: Object.fromEntries(
            Object.entries(results.counts).map(([label, count]) => [label, count])
          ),
          screenshot_base64: `data:image/jpeg;base64,${results.annotated_image}`
        })
      });
      
      if (response.ok) {
        alert('Scan saved to history database successfully!');
      } else {
        alert('Failed to save scan to database.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving scan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Comparison slider events
  const handleSliderMove = (clientX) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleTouchStart = () => {
    isDragging.current = true;
  };

  // Add global mousemove/mouseup listeners when dragging starts
  React.useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDragging.current) return;
      handleSliderMove(e.clientX);
    };

    const handleGlobalTouchMove = (e) => {
      if (!isDragging.current) return;
      if (e.touches && e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-neon-blue glow-border-blue animate-pulse"></span>
          Upload Image Scan
        </h2>
        <p className="text-neutral-400 mt-1">Upload currency photos for high-resolution static analysis.</p>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Main Workspace */}
      {!file ? (
        // Dropzone Area
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="w-full min-h-[400px] border-2 border-dashed border-neutral-800 hover:border-neon-blue/40 rounded-2xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300 bg-neutral-950/20 hover:bg-neon-blue/5 glass-panel"
        >
          <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-6 shadow-xl">
            <Upload size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Drag and drop your image here</h3>
          <p className="text-neutral-500 text-sm max-w-sm mb-6">
            Supports JPG, JPEG, PNG, and WEBP formats. Large images are automatically optimized.
          </p>
          
          <label className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl border border-neutral-800 hover:border-neon-blue/30 transition-all duration-300 cursor-pointer shadow-lg">
            Choose File
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        // Preview & Results Panel
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Visual Workspace: Slider or Side-by-Side */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl glass-panel relative">
              <button
                onClick={clearImage}
                className="absolute top-6 right-6 z-30 p-2 bg-black/80 hover:bg-red-600 text-neutral-400 hover:text-white rounded-full transition-all duration-300 cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Slider Container */}
              {results ? (
                <div 
                  ref={sliderContainerRef}
                  className="relative w-full aspect-video rounded-xl overflow-hidden select-none cursor-ew-resize"
                  onMouseMove={(e) => isDragging.current && handleSliderMove(e.clientX)}
                >
                  {/* Original Image (Right side underneath) */}
                  <img
                    src={previewUrl}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                  
                  {/* Detected Image (Left side overlay) */}
                  <div 
                    className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
                    style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                  >
                    <img
                      src={`data:image/jpeg;base64,${results.annotated_image}`}
                      alt="Processed"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ width: sliderContainerRef.current?.clientWidth || '100%', height: '100%' }}
                    />
                  </div>
                  
                  {/* Sliding Indicator handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-neon-blue z-20 cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_#00f0ff]"
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                  >
                    <div className="w-8 h-8 rounded-full bg-neon-blue border-2 border-black flex items-center justify-center text-black shadow-2xl">
                      <FileImage size={14} className="stroke-[3]" />
                    </div>
                  </div>

                  {/* Badges to mark sides */}
                  <span className="absolute bottom-4 left-4 px-2 py-1 rounded bg-black/70 text-neon-blue font-bold text-xs z-10 border border-neon-blue/20">DETECTION SCAN</span>
                  <span className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/70 text-white font-bold text-xs z-10 border border-neutral-800">ORIGINAL</span>
                </div>
              ) : (
                // Simple Preview before analysis
                <div className="w-full aspect-video rounded-xl overflow-hidden relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
                      <RefreshCw size={36} className="animate-spin text-neon-blue mb-3" />
                      <span className="text-neon-blue glow-text-blue font-bold text-sm tracking-widest uppercase animate-pulse">Analyzing Currency...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Main Action buttons */}
            <div className="flex flex-col gap-3 w-full">
              {!results && (
                <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-800/60 bg-neutral-950/20 hover:bg-neutral-900/20 cursor-pointer transition-all duration-300">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">Automated Counterfeit Check</span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">Run HSV color & aspect ratio checks on this image</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={counterfeitCheckEnabled}
                    onChange={(e) => setCounterfeitCheckEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-neon-blue accent-neon-blue bg-neutral-950 border-neutral-800 focus:ring-0 cursor-pointer"
                  />
                </label>
              )}

              <div className="flex gap-4 w-full">
                {!results ? (
                  <button
                    onClick={triggerUpload}
                    disabled={loading}
                    className="w-full py-3.5 bg-neon-blue hover:bg-neon-blue/90 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border-neutral-800 text-black font-extrabold rounded-xl transition-all duration-300 glow-border-blue shadow-[0_0_20px_rgba(0,240,255,0.2)] transform active:scale-95 cursor-pointer"
                  >
                    {loading ? 'Analyzing...' : 'Run Currency Detection'}
                  </button>
                ) : (
                <div className="flex w-full gap-4">
                  <button
                    onClick={clearImage}
                    className="flex-1 py-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-bold rounded-xl transition-all duration-300 cursor-pointer"
                  >
                    Upload New Image
                  </button>
                  
                  <button
                    onClick={downloadResult}
                    className="flex-1 py-3.5 bg-neon-blue hover:bg-neon-blue/90 text-black font-bold rounded-xl border border-neon-blue/30 glow-border-blue shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download size={18} />
                    Download Annotated
                  </button>
                  
                   <button
                    onClick={saveToHistory}
                    disabled={results.predictions.some(p => p.authenticity_status === 'counterfeit' || p.authenticity_status === 'suspicious')}
                    className="flex-1 py-3.5 bg-neon-green hover:bg-neon-green/90 text-black font-bold rounded-xl border border-neon-green/30 disabled:bg-neutral-900 disabled:text-neutral-500 disabled:border-neutral-800 disabled:shadow-none disabled:opacity-50 disabled:cursor-not-allowed glow-border-green shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save size={18} />
                    Save History
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Right Column: Statistics & Results Summary */}
          <div className="flex flex-col gap-6">
            
            {/* Counterfeit Alert Banner */}
            {results && results.predictions.some(p => p.authenticity_status === 'counterfeit' || p.authenticity_status === 'suspicious') && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-400 flex flex-col gap-2 shadow-[0_0_20px_rgba(220,38,38,0.15)] animate-pulse">
                <div className="flex items-center gap-2 font-black text-sm text-red-400">
                  <ShieldAlert className="shrink-0 text-red-500" size={18} />
                  SECURITY ALERT: FAKE NOTE DETECTED
                </div>
                <div className="space-y-1">
                  {results.predictions.map((p, idx) => (
                    (p.authenticity_status === 'counterfeit' || p.authenticity_status === 'suspicious') && (
                      <p key={idx} className="text-xs text-neutral-300 pl-6 leading-relaxed">
                        • Note #{idx + 1} ({p.class}): <span className="text-red-400 font-semibold">{p.flag_reason || "Flagged as suspicious."}</span>
                      </p>
                    )
                  ))}
                </div>
              </div>
            )}
            
            {/* Value Dashboard */}
            <div className="p-6 rounded-2xl glass-panel border-neutral-800 glow-border-blue flex flex-col justify-between min-h-[160px]">
              <div>
                <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Detected Currency Amount</span>
                <div className="text-5xl font-black text-neon-blue glow-text-blue mt-2 font-mono">
                  ₹{results ? results.total_value.toLocaleString() : '0'}
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-neutral-800/80 pt-4 mt-6">
                <div>
                  <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider">Status</span>
                  <span className="text-sm font-bold text-white mt-0.5 block font-mono">
                    {results ? 'Completed' : file ? 'Pending Run' : 'Empty'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider">Notes Count</span>
                  <span className="text-sm font-bold text-white mt-0.5 block text-right font-mono">
                    {results ? results.predictions.length : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Results Cards Breakdown */}
            <div className="p-6 rounded-2xl glass-panel border-neutral-800 flex flex-col gap-3">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Denomination Summary</h3>
              
              <div className="flex flex-col gap-2">
                {['₹10', '₹20', '₹50', '₹100', '₹200', '₹500', '₹2000'].map(denom => {
                  const count = results ? results.counts[denom] || 0 : 0;
                  const isDetected = count > 0;
                  const totalVal = count * (parseInt(denom.replace('₹', ''), 10) || 0);
                  
                  return (
                    <div
                      key={denom}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                        isDetected 
                          ? 'bg-neon-blue/5 border-neon-blue/20 text-white' 
                          : 'bg-neutral-900/40 border-neutral-800/60 text-neutral-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs border ${
                          isDetected 
                            ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue' 
                            : 'bg-neutral-800/50 border-neutral-700/50 text-neutral-400'
                        }`}>
                          {denom}
                        </span>
                        <span className="text-xs font-semibold">Count: {count}</span>
                      </div>
                      
                      <span className="font-mono font-bold text-sm">
                        ₹{totalVal.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detected Notes Log */}
            {results && results.predictions && results.predictions.length > 0 && (
              <div className="p-6 rounded-2xl glass-panel border-neutral-800 flex flex-col gap-3 max-h-[350px] overflow-y-auto">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                  Detected Notes Log
                  <span className="px-2 py-0.5 rounded text-[10px] bg-neon-blue/10 text-neon-blue border border-neon-blue/20">
                    {results.predictions.length} total
                  </span>
                </h3>
                
                <div className="flex flex-col gap-2">
                  {results.predictions.map((note, idx) => {
                    const isSuspicious = note.authenticity_status === 'suspicious';
                    const isCounterfeit = note.authenticity_status === 'counterfeit';
                    const isVerified = note.authenticity_status === 'verified' || note.authenticity_status === 'genuine_verified';
                    
                    let badgeBg = 'bg-neutral-900/60 text-neutral-400 border-neutral-800';
                    let badgeText = 'Unchecked';
                    let badgeIcon = <Info size={12} />;
                    
                    if (isCounterfeit) {
                      badgeBg = 'bg-red-950/40 text-red-400 border-red-500/20';
                      badgeText = 'Fake';
                      badgeIcon = <XCircle size={12} />;
                    } else if (isSuspicious) {
                      badgeBg = 'bg-amber-950/40 text-amber-400 border-amber-500/20 animate-pulse';
                      badgeText = 'Suspicious';
                      badgeIcon = <ShieldAlert size={12} />;
                    } else if (isVerified || note.authenticity_status === 'genuine') {
                      badgeBg = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20';
                      badgeText = isVerified ? 'Verified' : 'Genuine';
                      badgeIcon = <CheckCircle2 size={12} />;
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => openVerificationModal(note, idx)}
                        className={`group flex items-center justify-between p-3 rounded-xl border bg-neutral-900/30 border-neutral-800/80 hover:border-neutral-700/80 transition-all duration-200 cursor-pointer hover:bg-neutral-800/20 hover:translate-x-1`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs border bg-neutral-900 border-neutral-800 text-neutral-300 group-hover:border-neutral-600 transition-colors`}>
                            {note.class}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white font-mono">Note #{idx + 1}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">{(note.confidence * 100).toFixed(0)}% conf</span>
                            </div>
                            {note.flag_reason && isSuspicious && (
                              <p className="text-[10px] text-amber-500/80 mt-0.5 max-w-[150px] truncate">{note.flag_reason}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeBg}`}>
                          {badgeIcon}
                          {badgeText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* Genuine Verification Modal */}
      {selectedNoteForVerification && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-800/80 flex items-center justify-between bg-gradient-to-r from-neutral-900 to-neutral-950">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-neon-blue/10 border border-neon-blue/30 text-neon-blue flex items-center justify-center font-black text-sm">
                  {selectedNoteForVerification.class}
                </span>
                <div>
                  <h3 className="font-extrabold text-lg text-white">RBI Security Verification</h3>
                  <p className="text-xs text-neutral-500">Manual inspection checklist for Note #{selectedNoteIndex + 1}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedNoteForVerification(null)}
                className="text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              {/* Auto check banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                selectedNoteForVerification.authenticity_status === 'suspicious'
                  ? 'bg-amber-950/20 border-amber-500/20 text-amber-400'
                  : selectedNoteForVerification.authenticity_status === 'counterfeit'
                  ? 'bg-red-950/20 border-red-500/20 text-red-400'
                  : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
              }`}>
                <ShieldAlert className="shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <h4 className="font-bold text-sm">
                    Automated Authenticity: {
                      selectedNoteForVerification.authenticity_status === 'suspicious' ? 'Flagged Suspicious' :
                      selectedNoteForVerification.authenticity_status === 'counterfeit' ? 'Flagged Counterfeit' : 'Passed Color Profile'
                    }
                  </h4>
                  <p className="text-xs mt-1 text-neutral-400">
                    {selectedNoteForVerification.flag_reason || "Color and dimensions fall within standard tolerance limits."}
                  </p>
                </div>
              </div>

              {/* Checklist Instructions */}
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">RBI Mandated Security Features</h4>
                <div className="space-y-3">
                  {(RBI_SECURITY_MARKERS[selectedNoteForVerification.class] || RBI_SECURITY_MARKERS["₹500"]).map((marker, mIdx) => {
                    const isChecked = !!verificationChecklist[mIdx];
                    return (
                      <div 
                        key={mIdx}
                        onClick={() => toggleVerificationCheck(mIdx)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isChecked 
                            ? 'bg-neon-blue/5 border-neon-blue/30 text-white' 
                            : 'bg-neutral-900/40 border-neutral-800/40 text-neutral-400 hover:border-neutral-700/60'
                        }`}
                      >
                        <div className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-neon-blue border-neon-blue text-black' 
                            : 'border-neutral-600'
                        }`}>
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-medium leading-relaxed">{marker}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-neutral-800/80 bg-neutral-950/50 flex gap-3">
              <button
                onClick={() => {
                  setNoteVerificationStatus('counterfeit');
                  setSelectedNoteForVerification(null);
                }}
                className="flex-1 py-3 bg-red-950/40 border border-red-500/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <XCircle size={16} />
                Flag Fake
              </button>
              
              <button
                onClick={() => {
                  setNoteVerificationStatus('verified');
                  setSelectedNoteForVerification(null);
                }}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition-all duration-200 shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Verify Genuine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
