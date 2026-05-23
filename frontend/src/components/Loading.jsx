import React from 'react';
import { Loader } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-24 animate-in fade-in duration-300 select-none">
      <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-sm animate-pulse">Loading...</p>
    </div>
  );
}
