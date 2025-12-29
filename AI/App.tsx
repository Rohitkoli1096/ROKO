
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { rokoService } from './services/geminiService';
import { LogEntry, ConnectionStatus } from './types';
import CircularHUD from './components/CircularHUD';
import AudioVisualizer from './components/AudioVisualizer';
import Console from './components/Console';
import { LiveServerMessage } from '@google/genai';

const VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

// Utilities for audio
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const createBlob = (data: Float32Array): any => {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
};

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [inputText, setInputText] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [activeVoice, setActiveVoice] = useState('Zephyr');
  
  // UI State for Special Effects
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const liveSessionRef = useRef<any>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'system') => {
    setLogs(prev => [...prev.slice(-100), {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      type,
      message
    }]);
  }, []);

  useEffect(() => {
    const intro = [
      "Initialising ROKO Neural Network...",
      "Connecting to Core Matrix [Rohit Koli Protocols]...",
      "Voice Synthesis: OK. Vision Processing: OK. Logic Engine: ONLINE.",
      "Greetings Sir. I am ROKO. How may I assist you today?"
    ];
    intro.forEach((msg, i) => setTimeout(() => addLog(msg, 'system'), i * 800));
  }, [addLog]);

  const handleLiveInteraction = async () => {
    if (isLiveActive) {
      if (liveSessionRef.current) liveSessionRef.current.close();
      setIsLiveActive(false);
      setStatus(ConnectionStatus.DISCONNECTED);
      addLog("Voice uplink terminated.", 'command');
      return;
    }

    try {
      setStatus(ConnectionStatus.CONNECTING);
      addLog(`Initiating neural link with ${activeVoice} voice matrix...`, 'command');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = outputAudioCtxRef.current.createGain();
      outputNode.connect(outputAudioCtxRef.current.destination);

      const sessionPromise = rokoService.connectLive(activeVoice, {
        onopen: () => {
          setIsLiveActive(true);
          setStatus(ConnectionStatus.CONNECTED);
          addLog(`Interface established. Voice core: ${activeVoice}`, 'system');

          const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const source = inputAudioCtx.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromise.then(session => {
              if (session && !session.closed) session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioCtx.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioCtxRef.current) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtxRef.current.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioCtxRef.current, 24000, 1);
            const source = outputAudioCtxRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
          }
          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: () => setStatus(ConnectionStatus.ERROR),
        onclose: () => {
          setIsLiveActive(false);
          setStatus(ConnectionStatus.DISCONNECTED);
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      addLog("Microphone access denied or hardware failure.", 'error');
    }
  };

  const executePhysicalTask = (cmd: string) => {
    const lower = cmd.toLowerCase();
    
    if (lower.includes('screenshot')) {
      addLog("Capturing system state... Snapshot stored.", 'command');
      setShowScreenshot(true);
      setTimeout(() => setShowScreenshot(false), 300);
      return true;
    }

    if (lower.includes('shutdown')) {
      addLog("Initiating emergency shutdown sequence...", 'command');
      setIsShuttingDown(true);
      return true;
    }

    if (lower.includes('open') || lower.includes('launch')) {
      const appName = lower.split('open ')[1] || lower.split('launch ')[1] || 'application';
      addLog(`Bypassing security protocols... Launching ${appName} in virtual sandbox.`, 'command');
      setTimeout(() => addLog(`${appName.toUpperCase()} interface ready on secondary monitor.`, 'system'), 1500);
      return true;
    }

    return false;
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;

    const cmd = inputText.trim();
    setInputText('');
    addLog(cmd, 'user');

    if (executePhysicalTask(cmd)) return;

    setIsThinking(true);
    if (cmd.toLowerCase().startsWith('image') || cmd.toLowerCase().startsWith('generate image')) {
      const prompt = cmd.replace(/image|generate image/i, '').trim();
      addLog(`Synthesizing visual asset: ${prompt}`, 'command');
      try {
        const url = await rokoService.generateImage(prompt);
        if (url) {
          setGeneratedImage(url);
          addLog("Image rendering complete.", 'ai');
        }
      } catch (err) {
        addLog("Neural network failed to render visual asset.", 'error');
      }
    } else {
      try {
        const response = await rokoService.textInteraction(cmd);
        addLog(response || "No data received.", 'ai');
      } catch (err) {
        addLog("Uplink failed. Check network stability.", 'error');
      }
    }
    setIsThinking(false);
  };

  if (isShuttingDown) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-hud text-red-600 animate-pulse">
        <div className="text-4xl mb-4">SYSTEM_HALTED</div>
        <div className="text-sm tracking-widest">ROKO HAS LEFT THE BUILDING.</div>
        <button onClick={() => setIsShuttingDown(false)} className="mt-8 border border-red-600 px-4 py-2 hover:bg-red-600 hover:text-black transition-colors">REBOOT_CORE</button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden relative selection:bg-cyan-500 selection:text-black">
      {/* Screenshot Flash */}
      {showScreenshot && <div className="fixed inset-0 bg-white z-[100] animate-pulse"></div>}

      {/* Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10"></div>
      
      {/* HUD Header */}
      <header className="p-4 flex justify-between items-center border-b border-cyan-500/10 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-400 rounded-lg flex items-center justify-center font-hud text-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.5)]">R</div>
          <div>
            <h1 className="text-sm font-hud font-bold text-cyan-400 tracking-widest">ROKO_OS v2.4</h1>
            <p className="text-[9px] text-cyan-600/60 font-mono uppercase">Master Node: Rohit Koli // Auth: Verified</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[10px] text-cyan-500 uppercase font-bold">Voice Core</span>
            <select 
              value={activeVoice}
              onChange={(e) => setActiveVoice(e.target.value)}
              className="bg-transparent border-none text-xs text-cyan-400 outline-none cursor-pointer font-hud"
            >
              {VOICES.map(v => <option key={v} value={v} className="bg-slate-900">{v}</option>)}
            </select>
          </div>
          <div className="h-8 w-px bg-cyan-500/20"></div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-cyan-500 uppercase font-bold">Uplink Stat</span>
            <span className={`text-xs font-hud ${status === ConnectionStatus.CONNECTED ? 'text-green-400' : 'text-yellow-400'}`}>{status}</span>
          </div>
        </div>
      </header>

      {/* Main UI */}
      <main className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden relative z-20">
        {/* Left Column: HUD & Voice */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 items-center justify-center">
          <div className="relative">
            <CircularHUD status={status} />
          </div>
          
          <div className="w-full max-w-md bg-black/40 border border-cyan-500/20 rounded-xl p-4 backdrop-blur-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-hud text-cyan-400 tracking-widest">Neural frequency</span>
              <div className="flex gap-1">
                {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></div>)}
              </div>
            </div>
            <div className="h-20 mb-6 bg-cyan-950/10 rounded-lg overflow-hidden border border-cyan-500/10">
              <AudioVisualizer isListening={isLiveActive} isActive={status === ConnectionStatus.CONNECTED} stream={micStream} />
            </div>
            <button 
              onClick={handleLiveInteraction}
              className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-hud text-sm tracking-[0.3em] transition-all border-2
                ${isLiveActive 
                  ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
                  : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_30px_rgba(0,242,255,0.1)]'
                }`}
            >
              <div className={`w-3 h-3 rounded-full ${isLiveActive ? 'bg-red-500 animate-ping' : 'bg-cyan-400 animate-pulse'}`}></div>
              {isLiveActive ? 'TERMINATE_LINK' : 'ESTABLISH_UPLINK'}
            </button>
          </div>
        </div>

        {/* Right Column: Console & Interactions */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <Console logs={logs} />
            
            {generatedImage && (
              <div className="h-64 rounded-xl border border-cyan-500/30 relative overflow-hidden group shadow-2xl">
                <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-4 left-4 font-hud text-[10px] text-cyan-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                  VISUAL_SYNTHESIS_COMPLETE
                </div>
                <button 
                  onClick={() => setGeneratedImage(null)}
                  className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-red-500/80 transition-all hover:scale-110"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            )}
          </div>

          {/* CMD Interface */}
          <form onSubmit={handleCommand} className="relative mt-2">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 rounded-xl blur-lg opacity-50"></div>
            <div className="relative flex items-center bg-black/80 backdrop-blur-xl rounded-xl border border-cyan-500/30 px-6 py-4 transition-all focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(0,242,255,0.1)]">
              <span className="text-cyan-400 mr-3 font-hud text-xs font-bold tracking-widest opacity-80 shrink-0">ROKO_CLI&gt;</span>
              <textarea 
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommand(e as any);
                  }
                }}
                placeholder="Direct command... (e.g., 'image of cyborg city', 'screenshot', 'open discord')"
                className="flex-1 bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-900/60 font-mono text-sm resize-none"
                disabled={isThinking}
              />
              <button 
                type="submit" 
                className={`ml-4 transition-all ${isThinking ? 'text-cyan-800 animate-spin' : 'text-cyan-400 hover:text-cyan-200 hover:scale-110'}`}
                disabled={isThinking}
              >
                {isThinking ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="w-6 h-6 shadow-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Futuristic footer */}
      <footer className="p-3 border-t border-cyan-500/10 flex justify-between items-center text-[8px] tracking-[0.4em] text-cyan-600/40 font-hud z-20">
        <div className="flex gap-4">
          <span>LAT_UPDATED: 0.04s</span>
          <span>BUFFER_HEALTH: 98%</span>
          <span>NODES: 1,424</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500"></div>
          SYNC_AUTH: Rohit Koli
        </div>
      </footer>
    </div>
  );
};

export default App;
