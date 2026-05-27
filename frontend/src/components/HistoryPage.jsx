import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Trash2, FileSpreadsheet, Eye, X, Trash, FileImage, RefreshCw, ShieldAlert } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null); // lightbox image URL

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/history`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const deleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this scan log?")) return;
    try {
      const response = await fetch(`${API_BASE}/api/history/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        setHistory(history.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllHistory = async () => {
    if (!window.confirm("WARNING: This will permanently delete ALL scan history. Are you sure?")) return;
    try {
      const response = await fetch(`${API_BASE}/api/history/clear`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        setHistory([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    
    // Compile CSV headers & rows
    const headers = ["ID", "Timestamp", "Total Amount (INR)", "Note Counts"];
    const rows = history.map(item => {
      // Compile note counts format: "500:2|100:3" or "500x2, 100x3"
      const noteCounts = Object.entries(item.counts)
        .filter(([_, count]) => count > 0)
        .map(([denom, count]) => `${denom}x${count}`)
        .join('; ');
      
      // format iso timestamp to readable CSV format
      const formattedTime = new Date(item.timestamp).toLocaleString().replace(/,/g, '');
      
      return [
        item.id,
        formattedTime,
        item.total_amount,
        `"${noteCounts}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `moneyvision_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-neon-green glow-border-green animate-pulse"></span>
            Scan History
          </h2>
          <p className="text-neutral-400 mt-1">Database log of all captured and analyzed currencies.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 hover:border-neon-blue/30 text-white disabled:text-neutral-600 disabled:border-neutral-800 disabled:shadow-none font-bold rounded-lg transition-all duration-300 shadow-md cursor-pointer"
          >
            <FileSpreadsheet size={16} className="text-neon-blue" />
            Export CSV
          </button>
          
          <button
            onClick={clearAllHistory}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-950/20 border border-red-900/30 hover:bg-red-900/20 text-red-400 disabled:text-neutral-600 disabled:border-neutral-800 disabled:shadow-none font-bold rounded-lg transition-all duration-300 shadow-md cursor-pointer"
          >
            <Trash size={16} />
            Clear Database
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw size={36} className="animate-spin text-neon-green" />
        </div>
      ) : history.length === 0 ? (
        <div className="min-h-[300px] rounded-2xl border border-neutral-800 flex flex-col items-center justify-center p-8 text-center bg-neutral-950/20 glass-panel">
          <Calendar size={48} className="text-neutral-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Scan Records</h3>
          <p className="text-neutral-500 text-sm max-w-sm">You haven't saved any scan logs yet. Scans saved from the Camera page or Upload page will appear here.</p>
        </div>
      ) : (
        // Responsive Log List
        <div className="flex flex-col gap-4">
          {history.map(item => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/20 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 glass-panel"
            >
              {/* Image Preview & Details */}
              <div className="flex items-center gap-5 w-full md:w-auto">
                {item.screenshot_base64 ? (
                  <div 
                    className="relative w-24 h-16 rounded-lg overflow-hidden border border-neutral-800 group cursor-zoom-in shrink-0 bg-neutral-900"
                    onClick={() => setSelectedImage(item.screenshot_base64)}
                  >
                    <img
                      src={item.screenshot_base64}
                      alt="Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 text-white">
                      <Eye size={14} />
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-center text-neutral-600 shrink-0">
                    <FileImage size={20} />
                  </div>
                )}
                
                <div className="flex flex-col gap-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-sm font-semibold text-neutral-400">{formatTime(item.timestamp)}</span>
                    {item.predictions && item.predictions.some(p => p.authenticity_status === 'counterfeit') && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-500/20 flex items-center gap-1 animate-pulse">
                        <ShieldAlert size={10} /> Counterfeit Flagged
                      </span>
                    )}
                    {item.predictions && !item.predictions.some(p => p.authenticity_status === 'counterfeit') && item.predictions.some(p => p.authenticity_status === 'suspicious') && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <ShieldAlert size={10} /> Suspicious Note Detected
                      </span>
                    )}
                  </div>
                  
                  {/* Notes list with authenticity statuses */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {item.predictions && Array.isArray(item.predictions) && item.predictions.length > 0 ? (
                      item.predictions.map((p, pIdx) => {
                        const isSuspicious = p.authenticity_status === 'suspicious';
                        const isCounterfeit = p.authenticity_status === 'counterfeit';
                        const isVerified = p.authenticity_status === 'verified' || p.authenticity_status === 'genuine_verified';
                        
                        let style = "bg-neutral-900/60 text-neutral-300 border-neutral-800";
                        let prefix = "";
                        
                        if (isCounterfeit) {
                          style = "bg-red-950/40 text-red-400 border-red-500/25";
                          prefix = "⚠️ FAKE: ";
                        } else if (isSuspicious) {
                          style = "bg-amber-950/40 text-amber-400 border-amber-500/25 animate-pulse";
                          prefix = "⚠️ SUSP: ";
                        } else if (isVerified) {
                          style = "bg-emerald-950/40 text-emerald-400 border-emerald-500/25";
                          prefix = "✓ ";
                        }
                        
                        return (
                          <span 
                            key={pIdx} 
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${style}`} 
                            title={p.flag_reason || (isVerified ? "Manually verified genuine" : "Passed automatic color validation")}
                          >
                            {prefix}{p.class}
                          </span>
                        );
                      })
                    ) : (
                      Object.entries(item.counts)
                        .filter(([_, count]) => count > 0)
                        .map(([denom, count]) => (
                          <span key={denom} className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-neutral-300 border border-neutral-800">
                            {denom} × {count}
                          </span>
                        ))
                    )}
                  </div>
                </div>
              </div>
              
              {/* Total & Action */}
              <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-neutral-800/80 pt-4 md:pt-0">
                <div className="flex flex-col md:items-end">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Total Amount</span>
                  <span className="text-2xl font-black text-neon-green glow-text-green font-mono mt-0.5">
                    ₹{item.total_amount.toLocaleString()}
                  </span>
                </div>
                
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-3 rounded-xl bg-neutral-900 hover:bg-red-950/20 text-neutral-400 hover:text-red-500 border border-neutral-800 hover:border-red-950/40 transition-all duration-300 cursor-pointer shadow-md"
                  title="Delete Scan Record"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal for Screenshots */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative max-w-4xl w-full max-h-[85vh] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-2xl glass-panel">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-neutral-800 text-white rounded-full transition-all duration-300 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="p-2">
              <img
                src={selectedImage}
                alt="Full Scan Screenshot"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
