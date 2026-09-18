import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Printer, ShieldCheck, Copy, Check, Stethoscope, Hospital } from 'lucide-react';

export default function DoctorQrModal({ isOpen, onClose, doctorInfo }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const doc = doctorInfo || {
    id: 'doc-501',
    name: 'Dr. Ananya Rao',
    qualification: 'MBBS, MD (General Medicine)',
    regNumber: 'KMC-45892',
    hospital: 'Manipal Hospital, Bengaluru',
    specialty: 'Internal Medicine & Chronic Care'
  };

  const qrPayload = JSON.stringify({
    type: 'MEDIKIOSK_DOCTOR_QR',
    doctorId: doc.id,
    doctorName: doc.name,
    qualification: doc.qualification,
    regNumber: doc.regNumber,
    regNo: doc.regNumber,
    hospital: doc.hospital,
    specialty: doc.specialty,
    timestamp: Date.now()
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn text-slate-900">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2B4A8A] flex items-center justify-center border border-blue-100">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">Doctor Consultation QR</h3>
              <p className="text-[11px] text-slate-500">Present to patient for record transmission</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Doctor Identity Card */}
        <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-[#2B4A8A] flex items-center justify-center text-white font-black text-base shadow-xs">
              AR
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-sm text-slate-900">{doc.name}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-600 font-medium">{doc.qualification}</p>
              <p className="text-[10px] text-slate-500 font-mono font-semibold">Reg: {doc.regNumber} • {doc.hospital}</p>
            </div>
          </div>
        </div>

        {/* Real-Time Local Scannable QR Code */}
        <div className="bg-white p-5 rounded-3xl mx-auto w-64 aspect-square shadow-md flex flex-col items-center justify-center relative border-2 border-slate-200">
          <QRCodeSVG
            value={qrPayload}
            size={200}
            level="M"
            includeMargin={true}
            className="w-full h-full rounded-xl"
          />
          <span className="mt-2 text-[10px] font-black tracking-wider text-slate-700 uppercase font-mono">
            {doc.id} • {doc.regNumber}
          </span>
        </div>

        {/* Instructions */}
        <p className="text-center text-xs text-slate-600 font-medium leading-relaxed">
          The patient uses their <strong className="text-slate-900">MediKiosk Patient App</strong> to scan this QR code. Upon scan, their summarized health history, red alerts, and active prescriptions will appear live in your <span className="text-[#2B4A8A] font-black">Reported Problem Summaries</span>.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors border border-slate-200"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copied ? 'Copied QR Payload!' : 'Copy QR Payload'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#2B4A8A] hover:bg-[#223B6E] text-white text-xs font-black transition-colors shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Print QR Card</span>
          </button>
        </div>

      </div>
    </div>
  );
}
