import React, { useState } from 'react';
import { Key, X, CheckCircle2, Cpu, ShieldCheck, Sparkles, FileText, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SarvamKeyModal({ onClose }) {
  const { sarvamApiKey, saveSarvamApiKey, geminiApiKey, saveGeminiApiKey } = useAuth();
  const [sarvamInput, setSarvamInput] = useState(sarvamApiKey || '');
  const [geminiInput, setGeminiInput] = useState(geminiApiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    saveSarvamApiKey(sarvamInput.trim());
    saveGeminiApiKey(geminiInput.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5 text-[#2B4A8A] font-bold text-lg">
            <div className="p-2 rounded-xl bg-blue-50 text-[#2B4A8A]">
              <Cpu className="w-5 h-5" />
            </div>
            <span>AI & OCR Configuration</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-5">
          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#2B4A8A]" />
                <span>Google Gemini API Key (Vision & OCR)</span>
              </label>
              {geminiApiKey ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              )}
            </div>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                value={geminiInput}
                onChange={(e) => setGeminiInput(e.target.value)}
                placeholder="AIzaSy... (Gemini 2.5 Flash Vision)"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Powers <strong>Gemini 2.5 Flash Vision OCR</strong> for deciphering handwritten doctor prescriptions.
            </p>
          </div>

          {/* Sarvam AI API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Mic className="w-3.5 h-3.5 text-[#2B4A8A]" />
                <span>Sarvam AI Subscription Key (Speech STT)</span>
              </label>
              {sarvamApiKey ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              )}
            </div>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                value={sarvamInput}
                onChange={(e) => setSarvamInput(e.target.value)}
                placeholder="sk_... (Sarvam AI Saaras STT)"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Powers 10 Indian language real-time voice speech-to-text recognition (`saaras:v1`).
            </p>
          </div>

          {/* Offline/Sandbox Notice */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-start space-x-3 text-xs text-[#2B4A8A]">
            <ShieldCheck className="w-5 h-5 text-[#2B4A8A] shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-700">
              <p className="font-bold text-[#2B4A8A]">Built-in Multi-Tier Offline Engine:</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                If no external keys are provided, Medikiosk automatically uses the <strong>Local Tesseract OCR Engine</strong> and intelligent clinical parsing so document digitization works seamlessly out-of-the-box!
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div className="flex items-center space-x-2 text-emerald-700 text-xs font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>AI Configuration saved successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                saveSarvamApiKey('');
                saveGeminiApiKey('');
                setSarvamInput('');
                setGeminiInput('');
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              Clear All Keys
            </button>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#2B4A8A] hover:bg-[#223B6E] rounded-xl shadow-md transition-all"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
