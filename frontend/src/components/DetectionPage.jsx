import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, VolumeX, Camera, Save, RefreshCw, AlertCircle, Sparkles, ShieldAlert, CheckCircle2, XCircle, Info, Check } from 'lucide-react';
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

export default function DetectionPage({ apiConfigured }) {
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceVoiceName, setVoiceVoiceName] = useState('');
  const [chimeEnabled, setChimeEnabled] = useState(true);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalValue: 0,
    avgConfidence: 0,
    lastDetected: 'None'
  });
  
  // Denomination counts
  const [counts, setCounts] = useState({
    "₹10": { count: 0, total: 0 },
    "₹20": { count: 0, total: 0 },
    "₹50": { count: 0, total: 0 },
    "₹100": { count: 0, total: 0 },
    "₹200": { count: 0, total: 0 },
    "₹500": { count: 0, total: 0 },
    "₹2000": { count: 0, total: 0 }
  });

  const accumulatedPredictionsRef = useRef([]);
  const [selectedNoteForVerification, setSelectedNoteForVerification] = useState(null);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(-1);
  const [verificationChecklist, setVerificationChecklist] = useState({});
  const [renderTrigger, setRenderTrigger] = useState(0);
  
  const forceUpdate = () => setRenderTrigger(v => v + 1);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const isProcessingRef = useRef(false);
  
  // Accumulator tracking refs
  const accumCountsRef = useRef({
    "₹10": 0,
    "₹20": 0,
    "₹50": 0,
    "₹100": 0,
    "₹200": 0,
    "₹500": 0,
    "₹2000": 0
  });
  
  const prevFrameCountsRef = useRef({
    "₹10": 0,
    "₹20": 0,
    "₹50": 0,
    "₹100": 0,
    "₹200": 0,
    "₹500": 0,
    "₹2000": 0
  });
  
  // To track when notes change for voice output and chime play
  const prevTotalValueRef = useRef(0);
  const voiceTimeoutRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    const fetchAudioSettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/settings`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          setVoiceEnabled(data.voice_enabled ?? true);
          setVoiceRate(data.voice_rate ?? 1.0);
          setVoicePitch(data.voice_pitch ?? 1.0);
          setVoiceVoiceName(data.voice_voice_name || '');
          setChimeEnabled(data.chime_enabled ?? true);
        }
      } catch (err) {
        console.warn("Could not load audio settings from backend:", err);
      }
    };
    fetchAudioSettings();
  }, []);

  const playChime = () => {
    if (!chimeEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
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
    } catch (err) {
      console.warn("Web Audio chime failed:", err);
    }
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

  const speakDetection = (countsData, totalVal) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Build speech string
    // Filter only denominations that have count > 0
    const detectedStrings = [];
    Object.entries(countsData).forEach(([denom, details]) => {
      if (details.count > 0) {
        const name = denom.replace('₹', ' ');
        detectedStrings.push(`${details.count} note${details.count > 1 ? 's' : ''} of ${name} rupees`);
      }
    });

    if (detectedStrings.length === 0) return;

    // Clear any pending speech
    window.speechSynthesis.cancel();

    const textToSpeak = `Detected ${detectedStrings.join(', ')}. Total ${totalVal} Rupees.`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    
    const voices = window.speechSynthesis.getVoices();
    if (voiceVoiceName) {
      const selected = voices.find(v => v.name === voiceVoiceName);
      if (selected) {
        utterance.voice = selected;
      }
    }
    
    // Fallback if voice not found or not specified
    if (!utterance.voice) {
      const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('female')));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const startCamera = async () => {
    if (!apiConfigured) {
      setError('Roboflow API Key is not configured. Please add it in the Settings tab.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Rear camera by default on phones
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setStreaming(true);
          setLoading(false);
          // Start the frame capture loop
          startFrameCapture();
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError('Failed to access webcam. Please ensure camera permissions are granted.');
      setLoading(false);
    }
  };

  const stopCamera = () => {
    setStreaming(false);
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    // Reset stats
    setStats({
      totalNotes: 0,
      totalValue: 0,
      avgConfidence: 0,
      lastDetected: 'None'
    });
    // Reset counts
    setCounts({
      "₹10": { count: 0, total: 0 },
      "₹20": { count: 0, total: 0 },
      "₹50": { count: 0, total: 0 },
      "₹100": { count: 0, total: 0 },
      "₹200": { count: 0, total: 0 },
      "₹500": { count: 0, total: 0 },
      "₹2000": { count: 0, total: 0 }
    });
    // Reset accumulation tracking refs
    accumulatedPredictionsRef.current = [];
    accumCountsRef.current = {
      "₹10": 0,
      "₹20": 0,
      "₹50": 0,
      "₹100": 0,
      "₹200": 0,
      "₹500": 0,
      "₹2000": 0
    };
    prevFrameCountsRef.current = {
      "₹10": 0,
      "₹20": 0,
      "₹50": 0,
      "₹100": 0,
      "₹200": 0,
      "₹500": 0,
      "₹2000": 0
    };
    prevTotalValueRef.current = 0;
  };

  const startFrameCapture = () => {
    // Run inference twice a second (every 500ms) for high speed real-time performance
    frameIntervalRef.current = setInterval(async () => {
      if (isProcessingRef.current || !videoRef.current) return;
      
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      // Downscale frame to 640x360 or 640x480 for fast network transfer and Roboflow workflow execution
      const scale = 640 / Math.max(video.videoWidth, 1);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64Frame = canvas.toDataURL('image/jpeg', 0.65);
      
      isProcessingRef.current = true;
      try {
        const response = await fetch(`${API_BASE}/api/detect-frame`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ image: base64Frame })
        });
        
        if (!response.ok) {
          throw new Error('API server returned error');
        }
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Handle successfully received predictions
        handleInferenceResult(data.predictions, data.counts, data.total_value);
      } catch (err) {
        console.error("Frame inference error:", err);
      } finally {
        isProcessingRef.current = false;
      }
    }, 600);
  };

  const handleInferenceResult = (predictions, backendCounts, totalValue) => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Sync canvas sizing with the video sizing as rendered
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Scale parameters from original 640 (which detect-frame resized to) to the canvas size
    // Wait, the Roboflow coordinate space of predictions is based on the input frame's width/height.
    // The detect-frame script resized to a max dimension of 640. So the predictions dimensions
    // are relative to that resized frame. Let's make sure our coordinate calculations match.
    // Actually, Roboflow workflows output coordinates relative to the input image size.
    // Our input image was sent as the canvas size (which was downscaled by scale, e.g. 640 width).
    // Let's compute scale factors to map predictions to current canvas.
    const inputWidth = 640;
    // Wait, detect-frame creates canvas matching the video aspect ratio. So we can scale coordinates.
    // A robust way: Roboflow returns x, y, width, height as center coordinates, and values are relative to the input frame.
    // Let's assume input frame dimensions were `video.videoWidth * scale` and `video.videoHeight * scale`.
    const scale = 640 / Math.max(video.videoWidth, 1);
    const frameW = video.videoWidth * scale;
    const frameH = video.videoHeight * scale;
    
    const scaleX = canvas.width / frameW;
    const scaleY = canvas.height / frameH;
    
    let confidenceSum = 0;
    let lastDetectedName = stats.lastDetected;
    
    predictions.forEach(pred => {
      const { x, y, width, height, class: label, confidence, authenticity_status } = pred;
      
      const isSuspicious = authenticity_status === "suspicious";
      
      // Calculate top-left corner
      const left = (x - width / 2) * scaleX;
      const top = (y - height / 2) * scaleY;
      const w = width * scaleX;
      const h = height * scaleY;
      
      confidenceSum += confidence;
      lastDetectedName = label;
      
      // Draw Bounding Box
      ctx.strokeStyle = isSuspicious ? '#ef4444' : '#39ff14'; // Neon Red if Suspicious, else Neon Green
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = isSuspicious ? '#ef4444' : '#39ff14';
      ctx.strokeRect(left, top, w, h);
      
      // Draw Label Background
      ctx.fillStyle = 'rgba(3, 7, 18, 0.85)';
      ctx.shadowBlur = 0; // reset shadow for text
      const labelText = `${isSuspicious ? '⚠️ ' : ''}${label} (${Math.round(confidence * 100)}%)${isSuspicious ? ' - SUSPICIOUS' : ''}`;
      ctx.font = 'bold 12px Inter, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      
      ctx.fillRect(left - 1.5, top - 24, textWidth + 16, 24);
      
      // Draw Label text
      ctx.fillStyle = isSuspicious ? '#ef4444' : '#39ff14';
      ctx.fillText(labelText, left + 6.5, top - 8);
    });
    
    // Update Stats and Counts
    const totalNotes = predictions.length;
    const avgConfidence = totalNotes > 0 ? Math.round((confidenceSum / totalNotes) * 100) : 0;

    // Calculate deltas and update accumulated counts
    let hasNewNotes = false;
    let addedValue = 0;
    const newAnnouncements = [];
    const newPredictionsToAccumulate = [];

    Object.keys(accumCountsRef.current).forEach(denom => {
      const currentVal = backendCounts[denom] || 0;
      const prevVal = prevFrameCountsRef.current[denom] || 0;
      
      if (currentVal > prevVal) {
        const delta = currentVal - prevVal;
        accumCountsRef.current[denom] += delta;
        addedValue += delta * intVal(denom);
        newAnnouncements.push({ denom, count: delta });
        hasNewNotes = true;
        
        // Accumulate individual note prediction structures from this frame
        const denomPreds = predictions.filter(p => p.class === denom);
        denomPreds.sort((a, b) => b.confidence - a.confidence);
        const addedPreds = denomPreds.slice(0, delta);
        newPredictionsToAccumulate.push(...addedPreds);
      }
      
      // Update the prevFrameCountsRef for the next frame
      prevFrameCountsRef.current[denom] = currentVal;
    });

    if (newPredictionsToAccumulate.length > 0) {
      accumulatedPredictionsRef.current.push(...newPredictionsToAccumulate);
      
      const hasFake = newPredictionsToAccumulate.some(p => p.authenticity_status === 'counterfeit' || p.authenticity_status === 'suspicious');
      if (hasFake) {
        playSiren();
      }
    }

    // Calculate session accumulated totals
    let totalNotesSession = 0;
    let totalValueSession = 0;
    Object.entries(accumCountsRef.current).forEach(([denom, count]) => {
      totalNotesSession += count;
      totalValueSession += count * intVal(denom);
    });

    setStats({
      totalNotes: totalNotesSession,
      totalValue: totalValueSession,
      avgConfidence: totalNotes > 0 ? avgConfidence : stats.avgConfidence,
      lastDetected: totalNotes > 0 ? lastDetectedName : stats.lastDetected
    });

    // Update individual denomination cards shown in the UI using accumulated counts
    const newCounts = { ...counts };
    Object.keys(newCounts).forEach(denom => {
      const count = accumCountsRef.current[denom] || 0;
      const val = intVal(denom);
      newCounts[denom] = {
        count,
        total: count * val
      };
    });
    setCounts(newCounts);

    // Play chime and announce new additions
    if (addedValue > 0) {
      playChime();
      
      // Debounce speaking to prevent spamming while user adjusts camera
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = setTimeout(() => {
        // Build speech string for additions
        const detectedStrings = [];
        newAnnouncements.forEach(({ denom, count }) => {
          const name = denom.replace('₹', ' ');
          detectedStrings.push(`${count} note${count > 1 ? 's' : ''} of ${name} rupees`);
        });
        
        if (detectedStrings.length > 0 && voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const textToSpeak = `Added ${detectedStrings.join(', ')}. Total ${totalValueSession} Rupees.`;
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.rate = voiceRate;
          utterance.pitch = voicePitch;
          
          const voices = window.speechSynthesis.getVoices();
          if (voiceVoiceName) {
            const selected = voices.find(v => v.name === voiceVoiceName);
            if (selected) utterance.voice = selected;
          }
          if (!utterance.voice) {
            const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('female')));
            if (preferredVoice) utterance.voice = preferredVoice;
          }
          window.speechSynthesis.speak(utterance);
        }
      }, 500);
    }
  };

  const intVal = (denom) => {
    return parseInt(denom.replace('₹', ''), 10) || 0;
  };

  const handleResetSession = () => {
    // Reset accumulation tracking refs
    accumulatedPredictionsRef.current = [];
    accumCountsRef.current = {
      "₹10": 0,
      "₹20": 0,
      "₹50": 0,
      "₹100": 0,
      "₹200": 0,
      "₹500": 0,
      "₹2000": 0
    };
    prevFrameCountsRef.current = {
      "₹10": 0,
      "₹20": 0,
      "₹50": 0,
      "₹100": 0,
      "₹200": 0,
      "₹500": 0,
      "₹2000": 0
    };
    setCounts({
      "₹10": { count: 0, total: 0 },
      "₹20": { count: 0, total: 0 },
      "₹50": { count: 0, total: 0 },
      "₹100": { count: 0, total: 0 },
      "₹200": { count: 0, total: 0 },
      "₹500": { count: 0, total: 0 },
      "₹2000": { count: 0, total: 0 }
    });
    setStats({
      totalNotes: 0,
      totalValue: 0,
      avgConfidence: 0,
      lastDetected: 'None'
    });
    prevTotalValueRef.current = 0;
    playChime();
  };

  // Capture screenshot and automatically save scan log to database
  const captureAndSaveScan = async () => {
    if (!streaming || stats.totalNotes === 0) return;
    
    setLoading(true);
    try {
      // Create a composite canvas showing the video frame + the annotations drawn on top
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = videoRef.current.videoWidth;
      compositeCanvas.height = videoRef.current.videoHeight;
      
      const ctx = compositeCanvas.getContext('2d');
      // 1. Draw video frame
      ctx.drawImage(videoRef.current, 0, 0, compositeCanvas.width, compositeCanvas.height);
      
      // 2. Draw canvas overlays
      // Since video and overlay canvas have the same aspect ratio, we can draw the overlay directly scaled
      ctx.drawImage(canvasRef.current, 0, 0, compositeCanvas.width, compositeCanvas.height);
      
      const screenshotBase64 = compositeCanvas.toDataURL('image/jpeg', 0.8);
      
      // Send to Flask history database
      const response = await fetch(`${API_BASE}/api/history`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          total_amount: stats.totalValue,
          predictions: accumulatedPredictionsRef.current,
          counts: Object.fromEntries(
            Object.entries(counts).map(([label, d]) => [label, d.count])
          ),
          screenshot_base64: screenshotBase64
        })
      });
      
      if (response.ok) {
        // Play success chime
        playChime();
        alert('Scan history log and screenshot saved successfully!');
      } else {
        const errorData = await response.json();
        alert('Failed to save scan: ' + (errorData.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error capturing scan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openVerificationModal = (note, index) => {
    setSelectedNoteForVerification(note);
    setSelectedNoteIndex(index);
    
    // Initialize checklist checks
    const savedChecks = note.verification_checks || {};
    setVerificationChecklist(savedChecks);
  };
  
  const toggleVerificationCheck = (markerIndex) => {
    setVerificationChecklist(prev => {
      const next = { ...prev, [markerIndex]: !prev[markerIndex] };
      
      // Update prediction ref in real-time
      if (accumulatedPredictionsRef.current[selectedNoteIndex]) {
        accumulatedPredictionsRef.current[selectedNoteIndex].verification_checks = next;
      }
      return next;
    });
  };
  
  const setNoteVerificationStatus = (status) => {
    if (accumulatedPredictionsRef.current[selectedNoteIndex]) {
      accumulatedPredictionsRef.current[selectedNoteIndex].authenticity_status = status;
      setSelectedNoteForVerification(prev => ({
        ...prev,
        authenticity_status: status
      }));
      forceUpdate();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-neon-green glow-border-green animate-pulse"></span>
            Real-Time Scanner
          </h2>
          <p className="text-neutral-400 mt-1">Live camera currency detection via browser streaming.</p>
        </div>
        
        {/* Voice control & Save Scan button */}
        <div className="flex gap-3">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-300 cursor-pointer ${
              voiceEnabled 
                ? 'bg-neon-green/10 border-neon-green/30 text-neon-green glow-border-green' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-400'
            }`}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {voiceEnabled ? 'Voice: ON' : 'Voice: OFF'}
          </button>
          
          <button
            onClick={handleResetSession}
            disabled={!streaming || stats.totalNotes === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300 cursor-pointer"
          >
            <RefreshCw size={16} />
            Reset Count
          </button>
          
          <button
            onClick={captureAndSaveScan}
            disabled={!streaming || stats.totalNotes === 0 || loading || accumulatedPredictionsRef.current.some(p => p.authenticity_status === 'counterfeit' || p.authenticity_status === 'suspicious')}
            className="flex items-center gap-2 px-5 py-2.5 bg-neon-blue hover:bg-neon-blue/80 disabled:bg-neutral-900 disabled:text-neutral-500 disabled:border-neutral-800 disabled:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg border border-neon-blue/30 disabled:border-transparent transition-all duration-300 glow-border-blue shadow-[0_0_15px_rgba(0,240,255,0.2)] transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Camera size={16} />
            Capture & Save Scan
          </button>
        </div>
      </div>

      {!apiConfigured && (
        <div className="p-4 mb-6 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Roboflow API Key Missing</h4>
            <p className="text-sm mt-0.5 text-red-400/80">
              The camera stream cannot start because no API Key is configured. Please navigate to the <b>Settings</b> tab to enter your key.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Left side camera feed, Right side live results dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Live Video Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative w-full aspect-video rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl glass-panel">
            {/* Grid background overlay when camera is not running */}
            {!streaming && (
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-4">
                  <Play size={28} className="translate-x-0.5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Webcam Stream Offline</h4>
                <p className="text-neutral-500 text-sm max-w-sm">Click "Start Webcam Feed" below to trigger browser camera mode and start scanning banknotes.</p>
              </div>
            )}

            {/* Video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: streaming ? 'block' : 'none' }}
            />
            
            {/* Dynamic canvas overlay for bounding boxes */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />
            
            {/* Loading scan state */}
            {loading && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                <RefreshCw size={36} className="animate-spin text-neon-green mb-3" />
                <span className="text-neon-green glow-text-green font-bold text-sm tracking-widest uppercase">Scanning currency...</span>
              </div>
            )}
          </div>
          
          {/* Start/Stop Camera controls */}
          <div className="flex gap-4">
            {!streaming ? (
              <button
                onClick={startCamera}
                disabled={!apiConfigured || loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-neon-green hover:bg-neon-green/90 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border-neutral-800 text-black font-extrabold rounded-xl transition-all duration-300 glow-border-green shadow-[0_0_20px_rgba(57,255,20,0.2)] transform active:scale-95 cursor-pointer"
              >
                <Play size={20} className="fill-black" />
                Start Webcam Feed
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.2)] transform active:scale-95 cursor-pointer"
              >
                <Square size={20} className="fill-white" />
                Stop Webcam Feed
              </button>
            )}
          </div>
        </div>
        
        {/* Right Column: Live Statistics Dashboard */}
        <div className="flex flex-col gap-6">
          
          {/* Counterfeit Alert Banner */}
          {accumulatedPredictionsRef.current.some(p => p.authenticity_status === 'counterfeit' || p.authenticity_status === 'suspicious') && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-400 flex flex-col gap-2 shadow-[0_0_20px_rgba(220,38,38,0.15)] animate-pulse">
              <div className="flex items-center gap-2 font-black text-sm text-red-400">
                <ShieldAlert className="shrink-0 text-red-500" size={18} />
                SECURITY ALERT: FAKE NOTE SCANNED
              </div>
              <div className="space-y-1">
                {accumulatedPredictionsRef.current.map((p, idx) => (
                  (p.authenticity_status === 'counterfeit' || p.authenticity_status === 'suspicious') && (
                    <p key={idx} className="text-xs text-neutral-300 pl-6 leading-relaxed">
                      • Note #{idx + 1} ({p.class}): <span className="text-red-400 font-semibold">{p.flag_reason || "Flagged as suspicious."}</span>
                    </p>
                  )
                ))}
              </div>
            </div>
          )}
          
          {/* Main Counter Panel */}
          <div className="p-6 rounded-2xl glass-panel border-neutral-800 glow-border-green flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Total Estimated Value</span>
              <div className="text-5xl font-black text-neon-green glow-text-green mt-2 font-mono">
                ₹{stats.totalValue.toLocaleString()}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-neutral-800/80 pt-4 mt-6">
              <div>
                <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider block">Notes</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5 block">{stats.totalNotes}</span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider block">Confidence</span>
                <span className="text-lg font-bold text-neon-blue glow-text-blue font-mono mt-0.5 block">{stats.avgConfidence}%</span>
              </div>
              <div className="col-span-1">
                <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider block">Last Note</span>
                <span className="text-sm font-bold text-white mt-1 block truncate font-mono">{stats.lastDetected}</span>
              </div>
            </div>
          </div>
          
          {/* Denominations breakdown counts */}
          <div className="p-6 rounded-2xl glass-panel border-neutral-800 flex flex-col gap-3">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              Denomination Breakdown
              {stats.totalNotes > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-neon-green/10 text-neon-green border border-neon-green/20 animate-pulse flex items-center gap-1">
                  <Sparkles size={10} /> Live
                </span>
              )}
            </h3>
            
            <div className="flex flex-col gap-2">
              {Object.entries(counts).map(([denom, details]) => {
                const isDetected = details.count > 0;
                return (
                  <div
                    key={denom}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                      isDetected 
                        ? 'bg-neon-green/5 border-neon-green/20 text-white' 
                        : 'bg-neutral-900/40 border-neutral-800/60 text-neutral-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs border ${
                        isDetected 
                          ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' 
                          : 'bg-neutral-800/50 border-neutral-700/50 text-neutral-400'
                      }`}>
                        {denom}
                      </span>
                      <span className="text-xs font-semibold">Count: {details.count}</span>
                    </div>
                    
                    <span className="font-mono font-bold text-sm">
                      ₹{details.total.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scanned Notes Log */}
          <div className="p-6 rounded-2xl glass-panel border-neutral-800 flex flex-col gap-3 max-h-[350px] overflow-y-auto">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              Scanned Notes Log
              <span className="px-2 py-0.5 rounded text-[10px] bg-neon-blue/10 text-neon-blue border border-neon-blue/20">
                {accumulatedPredictionsRef.current.length} total
              </span>
            </h3>
            
            <div className="flex flex-col gap-2">
              {accumulatedPredictionsRef.current.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-xs">
                  No notes scanned in this session yet.
                </div>
              ) : (
                accumulatedPredictionsRef.current.map((note, idx) => {
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
                })
              )}
            </div>
          </div>
          
        </div>
      </div>

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
