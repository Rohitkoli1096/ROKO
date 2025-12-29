
import React from 'react';

interface CircularHUDProps {
  status: string;
}

const CircularHUD: React.FC<CircularHUDProps> = ({ status }) => {
  return (
    <div className="relative w-80 h-80 flex items-center justify-center scale-75 lg:scale-100">
      {/* Dynamic Data Rings */}
      <svg className="absolute w-full h-full animate-spin-slow-reverse opacity-20" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#00f2ff" strokeWidth="0.5" strokeDasharray="1, 4" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#00f2ff" strokeWidth="1" strokeDasharray="10, 20" />
      </svg>
      
      {/* Outer spinning ring with markers */}
      <div className="absolute w-full h-full border-2 border-dashed border-cyan-500/40 rounded-full animate-spin-slow">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-cyan-400"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-cyan-400"></div>
      </div>
      
      {/* Hexagon layer */}
      <div className="absolute w-64 h-64 opacity-30 animate-pulse">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M50 5 L93.3 30 L93.3 70 L50 95 L6.7 70 L6.7 30 Z" fill="none" stroke="#00f2ff" strokeWidth="1" />
        </svg>
      </div>

      {/* Rotating segments */}
      <div className="absolute w-56 h-56 border-y-4 border-cyan-400/30 rounded-full animate-spin-slow-reverse"></div>
      
      {/* Core Unit */}
      <div className="relative w-36 h-36 rounded-full bg-cyan-950/40 backdrop-blur-md flex flex-col items-center justify-center glow-blue border-2 border-cyan-400/60 shadow-[0_0_50px_rgba(0,242,255,0.2)]">
        <div className="absolute -top-6 text-[10px] text-cyan-400 font-bold tracking-widest opacity-80 animate-bounce">UPLINK_STABLE</div>
        
        <div className="text-hud text-xl text-cyan-300 font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-lg">ROKO</div>
        
        {/* Progress bars inside core */}
        <div className="flex gap-1 mb-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="w-1 h-3 bg-cyan-400/20 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
            </div>
          ))}
        </div>
        
        <div className="text-[10px] text-cyan-400 font-hud tracking-tighter uppercase font-bold animate-pulse px-2 text-center leading-tight">
          {status === 'CONNECTED' ? 'SYSTEM_ACTIVE' : status}
        </div>

        {/* Floating coordinates effect */}
        <div className="absolute -right-16 top-0 text-[8px] text-cyan-500 font-mono opacity-40 whitespace-nowrap">
          LAT: 18.5204<br/>LON: 73.8567<br/>ALT: 560M
        </div>
      </div>
    </div>
  );
};

export default CircularHUD;
