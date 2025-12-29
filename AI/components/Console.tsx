
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface ConsoleProps {
  logs: LogEntry[];
}

const Console: React.FC<ConsoleProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-black/60 border border-cyan-500/30 rounded-lg p-4 h-full overflow-y-auto font-mono text-xs space-y-2 backdrop-blur-xl relative">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyan-500/20 sticky top-0 bg-black/80 z-10 p-2 -m-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-cyan-400 font-bold tracking-widest uppercase">ROKO_OS v2.0 // LOG_STREAM</span>
        </div>
        <div className="text-[9px] text-cyan-600">ENCRYPTED_UPLINK: ACTIVE</div>
      </div>
      
      {logs.length === 0 && (
        <div className="flex items-center justify-center h-full opacity-20 flex-col">
          <svg className="w-12 h-12 mb-2 text-cyan-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          <div className="text-center font-hud">WAITING_FOR_INPUT...</div>
        </div>
      )}

      {logs.map((log) => (
        <div key={log.id} className="group flex gap-3 border-l-2 border-transparent hover:border-cyan-500/40 pl-2 transition-all">
          <span className="text-slate-600 shrink-0 font-bold">[{log.timestamp}]</span>
          <div className={`
            flex-1
            ${log.type === 'system' ? 'text-cyan-500' : ''}
            ${log.type === 'ai' ? 'text-white font-medium' : ''}
            ${log.type === 'user' ? 'text-indigo-400 font-bold italic' : ''}
            ${log.type === 'error' ? 'text-red-500 animate-pulse' : ''}
            ${log.type === 'command' ? 'text-yellow-400' : ''}
          `}>
            <span className="opacity-50 text-[10px] mr-2">[{log.type.toUpperCase()}]</span>
            <span className="leading-relaxed">{log.message}</span>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default Console;
