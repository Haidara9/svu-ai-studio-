
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Rewind, 
  FastForward, 
  Settings,
  Activity,
  MoreHorizontal
} from 'lucide-react'; 

declare global {
  interface Window {
    WaveSurfer: any;
  }
}

interface AudioPlayerProps {
  audioUrl: string | null;
  seekTo?: number | null;
  onTimeUpdate?: (time: number) => void;
  onDuration?: (duration: number) => void;
  onPlayPause?: (isPlaying: boolean) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, seekTo, onTimeUpdate, onDuration, onPlayPause }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLibLoaded, setIsLibLoaded] = useState(false);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // 1. Script Loader
  useEffect(() => {
    if (window.WaveSurfer) {
      setIsLibLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.min.js';
    script.async = true;
    script.onload = () => setIsLibLoaded(true);
    script.onerror = () => setHasError(true);
    document.body.appendChild(script);
  }, []);

  // 2. Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !isLibLoaded || !window.WaveSurfer) return;

    try {
        if (wavesurfer.current) {
            wavesurfer.current.destroy();
        }

        wavesurfer.current = window.WaveSurfer.create({
          container: containerRef.current,
          waveColor: 'rgba(79, 70, 229, 0.4)', // Indigo-600 with opacity
          progressColor: '#6366f1', // Indigo-500
          cursorColor: '#818cf8', // Indigo-400
          barWidth: 3,
          barGap: 3,
          barRadius: 3,
          height: 48, 
          normalize: true,
          minPxPerSec: 50,
          hideScrollbar: true,
        });

        wavesurfer.current.on('play', () => { setIsPlaying(true); onPlayPause?.(true); });
        wavesurfer.current.on('pause', () => { setIsPlaying(false); onPlayPause?.(false); });
        wavesurfer.current.on('finish', () => { setIsPlaying(false); onPlayPause?.(false); });
        wavesurfer.current.on('timeupdate', (time: number) => { setCurrentTime(time); onTimeUpdate?.(time); });
        wavesurfer.current.on('ready', (d: number) => { setDuration(d); onDuration?.(d); wavesurfer.current.setVolume(isMuted ? 0 : volume); setHasError(false); });
        wavesurfer.current.on('error', () => { console.warn("WaveSurfer error"); });

        if (audioUrl) wavesurfer.current.load(audioUrl);

    } catch (e) { setHasError(true); }

    return () => {
      if (wavesurfer.current) {
        try { wavesurfer.current.destroy(); } catch (e) {}
      }
    };
  }, [isLibLoaded]);

  useEffect(() => {
    if (audioUrl && wavesurfer.current && isLibLoaded) {
      try {
          setIsPlaying(false);
          wavesurfer.current.load(audioUrl);
      } catch(e) { setHasError(true); }
    }
  }, [audioUrl, isLibLoaded]);

  useEffect(() => {
    if (wavesurfer.current && typeof seekTo === 'number') {
        wavesurfer.current.setTime(seekTo);
        if (!isPlaying) wavesurfer.current.play();
    }
  }, [seekTo]);

  const togglePlay = useCallback(() => { if (!hasError && wavesurfer.current) wavesurfer.current.playPause(); }, [hasError]);
  const skip = useCallback((seconds: number) => { if (!hasError && wavesurfer.current) wavesurfer.current.skip(seconds); }, [hasError]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (wavesurfer.current) wavesurfer.current.setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
        if (wavesurfer.current) wavesurfer.current.setVolume(volume || 1);
        setIsMuted(false);
    } else {
        if (wavesurfer.current) wavesurfer.current.setVolume(0);
        setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
      setPlaybackRate(speed);
      if (wavesurfer.current) wavesurfer.current.setPlaybackRate(speed);
      setShowSpeedMenu(false);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasError) {
      return (
          <div className="w-full bg-red-950/30 border border-red-500/20 rounded-xl p-4 flex items-center justify-center text-red-400 text-sm gap-2 backdrop-blur-sm">
              <Activity className="w-4 h-4" />
              <span>Format not supported</span>
          </div>
      );
  }

  // Force LTR for controls
  return (
    <div className="w-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl transition-colors" dir="ltr">
      
      {/* Waveform Container */}
      <div className="w-full relative group cursor-pointer rounded-xl overflow-hidden bg-zinc-950/50 border border-zinc-800 h-16 shadow-inner">
         <div ref={containerRef} className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Playback Controls */}
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => skip(-10)} className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-all active:scale-95">
            <Rewind className="w-5 h-5" />
          </button>
          
          <button 
            onClick={togglePlay} 
            className={`w-12 h-12 flex items-center justify-center rounded-full text-white transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 ${
                isPlaying ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </button>

          <button onClick={() => skip(10)} className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-all active:scale-95">
            <FastForward className="w-5 h-5" />
          </button>

          <div className="hidden sm:block ml-2 font-mono text-xs text-zinc-500 tabular-nums bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 select-none min-w-[90px] text-center">
             {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-4">
            
            {/* Playback Speed */}
            <div className="relative">
                <button 
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        playbackRate !== 1 
                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30' 
                        : 'bg-zinc-800/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                    }`}
                >
                    <Settings className="w-3.5 h-3.5" />
                    <span className="w-6 text-center">{playbackRate}x</span>
                </button>
                
                {showSpeedMenu && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowSpeedMenu(false)}></div>
                        <div className="absolute bottom-full right-0 mb-2 w-28 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-30 flex flex-col p-1">
                            {speeds.map(speed => (
                                <button 
                                    key={speed} 
                                    onClick={() => handleSpeedChange(speed)} 
                                    className={`px-3 py-2 text-xs text-left rounded-lg transition-colors ${
                                        playbackRate === speed 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                    }`}
                                >
                                    {speed}x speed
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-800">
                <button onClick={toggleMute} className="text-zinc-500 hover:text-indigo-400 transition-colors">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="w-20 h-full flex items-center">
                     <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={isMuted ? 0 : volume} 
                        onChange={handleVolumeChange} 
                        className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none" 
                     />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
