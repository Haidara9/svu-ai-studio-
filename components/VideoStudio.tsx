
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { HistoryService } from '../services/history';
import { 
  Clapperboard, 
  Upload, 
  Settings2, 
  Layers, 
  Wand2, 
  Play, 
  Maximize2, 
  Video,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Aperture,
  MoveRight,
  Download,
  XCircle,
  RefreshCcw,
  Palette,
  Info,
  CheckCircle,
  VideoIcon,
  LayoutDashboard,
  FolderOpen,
  AlertCircle
} from 'lucide-react';

type GenMode = 'camera_motion' | 'frame_interpolation';

interface CameraSettings {
  pan: number;
  tilt: number;
  zoom: number;
  roll: number;
  shotSize: string;
}

interface InterpolationSettings {
  transition: string;
  strength: number;
}

const VIDEO_STYLES = [
  'Cinematic', 
  'Photorealistic', 
  'Anime', 
  '3D Render', 
  'Cyberpunk', 
  'Vintage', 
  'Noir', 
  'Vaporwave', 
  'Pixel Art', 
  'Claymation'
];

export const VideoStudio: React.FC = () => {
  // --- State ---
  const [mode, setMode] = useState<GenMode>('camera_motion');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [videoStyle, setVideoStyle] = useState('Cinematic');
  const [activeTab, setActiveTab] = useState('studio'); // dashboard, studio, assets, settings
  const [error, setError] = useState<string | null>(null);

  // Mode A: Camera Motion State
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    pan: 0,
    tilt: 0,
    zoom: 0,
    roll: 0,
    shotSize: 'Medium'
  });
  const [singleImage, setSingleImage] = useState<string | null>(null);

  // Mode B: Interpolation State
  const [interpSettings, setInterpSettings] = useState<InterpolationSettings>({
    transition: 'Morph',
    strength: 50
  });
  const [frameStart, setFrameStart] = useState<string | null>(null);
  const [frameEnd, setFrameEnd] = useState<string | null>(null);

  // Video Element Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Handlers ---
  const handleGenerate = async () => {
    // 1. Ensure API Key is Selected
    const win = window as any;
    if (win.aistudio) {
        try {
            const hasKey = await win.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await win.aistudio.openSelectKey();
            }
        } catch (e) {
            console.error("API Key check failed", e);
        }
    }

    setIsGenerating(true);
    setGeneratedVideo(null);
    setError(null);
    
    try {
        let videoUrl = '';
        const styleContext = `Visual Style: ${videoStyle}.`;

        if (mode === 'camera_motion') {
             // Construct prompt with camera settings for prompt-based control
             const panStr = cameraSettings.pan !== 0 ? `Pan ${cameraSettings.pan > 0 ? 'Right' : 'Left'} strength ${Math.abs(cameraSettings.pan)}. ` : '';
             const tiltStr = cameraSettings.tilt !== 0 ? `Tilt ${cameraSettings.tilt > 0 ? 'Up' : 'Down'} strength ${Math.abs(cameraSettings.tilt)}. ` : '';
             const zoomStr = cameraSettings.zoom !== 0 ? `Zoom ${cameraSettings.zoom > 0 ? 'In' : 'Out'} strength ${Math.abs(cameraSettings.zoom)}. ` : '';
             const rollStr = cameraSettings.roll !== 0 ? `Roll ${cameraSettings.roll} degrees. ` : '';
             
             const cameraContext = `Camera Movement: ${panStr}${tiltStr}${zoomStr}${rollStr}Shot Size: ${cameraSettings.shotSize}.`;
             const fullPrompt = `${prompt} ${styleContext} ${cameraContext} ${negativePrompt ? 'Avoid: ' + negativePrompt : ''}`;
             
             videoUrl = await GeminiService.generateVideo({
                 prompt: fullPrompt,
                 image: singleImage || undefined,
                 aspectRatio: '16:9'
             });
        } else if (mode === 'frame_interpolation') {
             const interpContext = `Transition type: ${interpSettings.transition}. Motion Strength: ${interpSettings.strength}%.`;
             const fullPrompt = `${prompt} ${styleContext} ${interpContext} ${negativePrompt ? 'Avoid: ' + negativePrompt : ''}`;
             
             videoUrl = await GeminiService.generateVideo({
                 prompt: fullPrompt || "Smooth cinematic transition between the two frames",
                 image: frameStart || undefined,
                 lastFrame: frameEnd || undefined,
                 aspectRatio: '16:9'
             });
        }
        
        setGeneratedVideo(videoUrl);
        
        // Log to history
        HistoryService.add({
            type: 'video',
            title: `توليد فيديو: ${prompt.substring(0, 30)}...`
        });

    } catch (e: any) {
        console.error("Generation failed", e);
        
        const errStr = JSON.stringify(e);
        const isPermissionError = 
            errStr.includes("403") || 
            errStr.includes("PERMISSION_DENIED") || 
            errStr.includes("The caller does not have permission");

        if (isPermissionError) {
             const retry = confirm("Generation failed: Permission Denied (403). Veo requires a valid paid API Key. Would you like to select a new API Key?");
             if (retry && win.aistudio) {
                 await win.aistudio.openSelectKey();
             }
        } else {
             setError("Generation failed. " + (e.message || "Unknown error"));
        }
    } finally {
        setIsGenerating(false);
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setter(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- Render Helpers ---
  const renderRangeSlider = (
    label: string, 
    value: number, 
    min: number, 
    max: number, 
    onChange: (val: number) => void,
    unit: string = '',
    description?: string
  ) => (
    <div className="mb-4 relative group/item">
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider cursor-help border-b border-dotted border-slate-700 hover:border-slate-500 transition-colors">{label}</label>
            {description && (
               <div className="group/tooltip relative">
                  <Info className="w-3 h-3 text-slate-600 hover:text-yellow-500 cursor-help transition-colors" />
                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-[10px] leading-relaxed text-slate-300 shadow-xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all translate-y-2 group-hover/tooltip:translate-y-0 z-50">
                    {description}
                    <div className="absolute -bottom-1 left-3 w-2 h-2 bg-slate-950 border-r border-b border-slate-700 transform rotate-45"></div>
                  </div>
               </div>
            )}
        </div>
        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
    </div>
  );

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-200 font-sans overflow-hidden" dir="ltr">
      
      {/* 1. Sidebar Navigation (Left) */}
      <div className="w-20 lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-30">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-4 lg:px-6 border-b border-slate-800 bg-slate-950/50">
             <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-yellow-500/20">
                <VideoIcon className="w-5 h-5 text-black" />
             </div>
             <div className="ml-3 hidden lg:block">
                <h1 className="text-sm font-bold text-white tracking-tight">BananaVision</h1>
                <p className="text-[10px] text-slate-500 font-mono">AI VIDEO SUITE</p>
             </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 py-6 space-y-2 px-2 lg:px-4">
              <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="hidden lg:block text-sm font-medium">Dashboard</span>
              </button>
              <button onClick={() => setActiveTab('studio')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                  <Clapperboard className="w-5 h-5" />
                  <span className="hidden lg:block text-sm font-medium">Video Studio</span>
              </button>
              <button onClick={() => setActiveTab('assets')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'assets' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                  <FolderOpen className="w-5 h-5" />
                  <span className="hidden lg:block text-sm font-medium">Assets</span>
              </button>
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                  <Settings2 className="w-5 h-5" />
                  <span className="hidden lg:block text-sm font-medium">Settings</span>
              </button>
          </div>

          {/* Footer User Profile */}
          <div className="p-4 border-t border-slate-800">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                 <div className="hidden lg:block">
                     <div className="text-xs font-bold text-white">Nano User</div>
                     <div className="text-[10px] text-green-400">Pro Plan</div>
                 </div>
             </div>
          </div>
      </div>

      {/* 2. Main Content Area (Center) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-dot-grid relative">
        {/* Top Bar */}
        <div className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Project:</span>
              <span className="text-sm font-bold text-white">New_Campaign_01</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[10px] font-bold text-green-500">SYSTEM ONLINE</span>
             </div>
           </div>
        </div>

        {/* Canvas / Viewport */}
        <div className="flex-1 p-8 flex items-center justify-center overflow-hidden">
          <div className="relative w-full max-w-5xl aspect-video bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden group">
            
            {/* Background Texture */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-10"></div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl backdrop-blur-md">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm font-bold">{error}</span>
                            <button onClick={() => setError(null)}><XCircle className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
                        </div>
                    </div>
                )}

                {isGenerating ? (
                   <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700 w-full max-w-md px-8">
                      <div className="relative w-24 h-24">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-yellow-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">🍌</div>
                      </div>
                      <div className="w-full space-y-2">
                          <div className="text-center">
                              <div className="text-sm font-bold text-yellow-500 tracking-widest uppercase mb-1">Synthesizing Video</div>
                              <div className="text-xs text-slate-500 font-mono">Nano Banana Pro Active...</div>
                          </div>
                          {/* Progress Bar */}
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 w-1/3 animate-[loading_2s_ease-in-out_infinite] rounded-full"></div>
                          </div>
                      </div>
                   </div>
                ) : generatedVideo ? (
                    <div className="relative w-full h-full bg-black">
                        <video 
                            ref={videoRef}
                            src={generatedVideo} 
                            className="w-full h-full object-contain" 
                            controls 
                            autoPlay 
                            loop 
                        />
                        <button 
                            onClick={() => setGeneratedVideo(null)}
                            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white backdrop-blur transition-all z-20"
                            title="Clear Result"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <>
                      {/* Mode Specific Previews */}
                      {mode === 'camera_motion' && singleImage && (
                          <div className="relative w-full h-full">
                              <img src={singleImage} alt="Preview" className="w-full h-full object-contain" />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-32 h-32 border-2 border-indigo-500/50 rounded-full animate-ping opacity-20"></div>
                              </div>
                              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-white">
                                  SOURCE IMAGE
                              </div>
                              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-mono text-indigo-400">
                                 P:{cameraSettings.pan} T:{cameraSettings.tilt} Z:{cameraSettings.zoom}
                              </div>
                          </div>
                      )}
                      
                      {mode === 'frame_interpolation' && (frameStart || frameEnd) && (
                          <div className="flex w-full h-full">
                              <div className="w-1/2 h-full border-r border-slate-800 relative bg-black/20">
                                  {frameStart ? (
                                    <img src={frameStart} className="w-full h-full object-cover opacity-80" />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-[10px] font-bold">MISSING START</span>
                                    </div>
                                  )}
                                  <div className="absolute top-4 left-4 text-[10px] font-bold bg-yellow-500 text-black px-2 py-1 rounded shadow-lg">START</div>
                              </div>
                              <div className="w-1/2 h-full relative bg-black/40 flex items-center justify-center">
                                  {frameEnd ? (
                                      <img src={frameEnd} className="w-full h-full object-cover opacity-80" />
                                  ) : (
                                      <div className="text-slate-500 text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-2">
                                          <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
                                            <Upload className="w-5 h-5" />
                                          </div>
                                          Upload End
                                      </div>
                                  )}
                                  <div className="absolute top-4 right-4 text-[10px] font-bold bg-indigo-500 text-white px-2 py-1 rounded shadow-lg">END</div>
                              </div>
                              
                              {/* Transition Indicator */}
                              {frameStart && frameEnd && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-black/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-xs font-mono text-white flex items-center gap-2 shadow-2xl">
                                        <MoveRight className="w-4 h-4 text-indigo-500" />
                                        {interpSettings.transition}
                                    </div>
                                </div>
                              )}
                          </div>
                      )}

                      {/* Empty State */}
                      {!isGenerating && !singleImage && !frameStart && !frameEnd && (
                          <div className="text-center p-8">
                              <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700/50 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 shadow-xl">
                                <Clapperboard className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                              </div>
                              <h3 className="text-2xl font-bold text-white mb-2">Ready to Create</h3>
                              <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                                  Select a mode from the configuration panel to begin your masterpiece.
                              </p>
                          </div>
                      )}
                    </>
                )}
            </div>

            {/* Playback Controls (Visual Only unless Generated) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-slate-950/90 backdrop-blur-md rounded-full border border-slate-800 shadow-xl z-20">
               <button 
                  onClick={() => { if (videoRef.current) videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); }}
                  className="text-slate-400 hover:text-white transition-colors"
               >
                   <Play className="w-4 h-4 fill-current" />
               </button>
               <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-indigo-500 ${isGenerating ? 'w-full animate-pulse' : 'w-1/3'}`}></div>
               </div>
               <span className="text-[10px] font-mono text-slate-400">00:00 / 00:05</span>
               <button className="text-slate-400 hover:text-white transition-colors"><Maximize2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Configuration Panel (Right Sidebar) */}
      <div className="w-[400px] bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden z-20 shadow-2xl shrink-0">
        
        {/* Panel Header */}
        <div className="p-6 border-b border-slate-800 shrink-0 bg-slate-900 z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-500" />
                Configuration
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wide">
                Nano Banana Pro
                </span>
            </div>
          </div>

          {/* Mode Toggle Switch */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex relative overflow-hidden mb-2">
            <button 
              onClick={() => setMode('camera_motion')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold rounded-lg transition-all z-10 ${mode === 'camera_motion' ? 'text-black bg-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Aperture className="w-4 h-4 mb-0.5" />
              Camera Motion
            </button>
            <button 
              onClick={() => setMode('frame_interpolation')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold rounded-lg transition-all z-10 ${mode === 'frame_interpolation' ? 'text-black bg-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Layers className="w-4 h-4 mb-0.5" />
              Interpolation
            </button>
          </div>
        </div>

        {/* Panel Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8">
          
          {/* Section: Assets */}
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ImageIcon className="w-3 h-3" /> Input Assets
              </h3>
              
              {mode === 'camera_motion' ? (
                <div className="relative group">
                  <input type="file" onChange={(e) => handleFileUpload(e, setSingleImage)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" accept="image/*" />
                  <div className={`
                      border-2 border-dashed rounded-xl h-44 flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden
                      ${singleImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'}
                  `}>
                    {singleImage ? (
                      <>
                        <img src={singleImage} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 bg-black/40" />
                        <div className="relative z-10 flex flex-col items-center gap-2">
                             <CheckCircle className="w-8 h-8 text-green-500" />
                             <span className="text-xs font-bold text-white">Image Ready</span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm">
                            <span className="text-xs font-bold text-white flex items-center gap-2"><RefreshCcw className="w-3 h-3" /> Replace</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors text-slate-400 shadow-lg">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-xs text-slate-400 font-medium group-hover:text-white transition-colors">Upload Source Image</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  {/* First Frame */}
                  <div className="flex-1 relative group">
                      <input type="file" onChange={(e) => handleFileUpload(e, setFrameStart)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" accept="image/*" />
                      <div className={`border-2 border-dashed rounded-xl h-24 flex items-center gap-4 px-4 transition-all ${frameStart ? 'border-green-500/30 bg-green-500/5' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'}`}>
                          {frameStart ? (
                            <img src={frameStart} className="w-16 h-16 object-cover rounded-lg border border-slate-600 shadow-sm shrink-0" />
                           ) : (
                            <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-black shrink-0">A</div>
                           )}
                           <div className="flex flex-col min-w-0">
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">First Frame</span>
                               <span className="text-xs text-slate-300 font-medium truncate">{frameStart ? 'Loaded' : 'Select'}</span>
                           </div>
                      </div>
                  </div>
                  
                  {/* Last Frame */}
                  <div className="flex-1 relative group">
                      <input type="file" onChange={(e) => handleFileUpload(e, setFrameEnd)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" accept="image/*" />
                      <div className={`border-2 border-dashed rounded-xl h-24 flex items-center gap-4 px-4 transition-all ${frameEnd ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'}`}>
                          {frameEnd ? (
                            <img src={frameEnd} className="w-16 h-16 object-cover rounded-lg border border-slate-600 shadow-sm shrink-0" />
                           ) : (
                            <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-black shrink-0">B</div>
                           )}
                           <div className="flex flex-col min-w-0">
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">Last Frame</span>
                               <span className="text-xs text-slate-300 font-medium truncate">{frameEnd ? 'Loaded' : 'Select'}</span>
                           </div>
                      </div>
                  </div>
                </div>
              )}
          </div>

          {/* Section: Parameters */}
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings2 className="w-3 h-3" /> Control Logic
            </h3>

            {mode === 'camera_motion' && (
               <div className="space-y-1 bg-slate-950/50 p-5 rounded-2xl border border-slate-800 shadow-inner">
                  {renderRangeSlider(
                    "Pan (X)", 
                    cameraSettings.pan, 
                    -10, 
                    10, 
                    (v) => setCameraSettings({...cameraSettings, pan: v}), 
                    '', 
                    "Horizontal movement."
                  )}
                  {renderRangeSlider(
                    "Tilt (Y)", 
                    cameraSettings.tilt, 
                    -10, 
                    10, 
                    (v) => setCameraSettings({...cameraSettings, tilt: v}), 
                    '', 
                    "Vertical movement."
                  )}
                  {renderRangeSlider(
                    "Zoom (Z)", 
                    cameraSettings.zoom, 
                    -10, 
                    10, 
                    (v) => setCameraSettings({...cameraSettings, zoom: v}), 
                    '', 
                    "Focal length change."
                  )}
                  {renderRangeSlider(
                    "Roll", 
                    cameraSettings.roll, 
                    -45, 
                    45, 
                    (v) => setCameraSettings({...cameraSettings, roll: v}), 
                    '°', 
                    "Dutch angle rotation."
                  )}
                  
                  <div className="pt-4 mt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Shot Size</label>
                    </div>
                    <select 
                        value={cameraSettings.shotSize}
                        onChange={(e) => setCameraSettings({...cameraSettings, shotSize: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-3 outline-none focus:border-indigo-500/50 transition-colors"
                    >
                        {['Macro', 'Close-up', 'Medium', 'Wide', 'Cinematic'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                  </div>
               </div>
            )}

            {mode === 'frame_interpolation' && (
                <div className="space-y-4 bg-slate-950/50 p-5 rounded-2xl border border-slate-800 shadow-inner">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Transition Type</label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {['Morph', 'Dissolve', 'Cross-fade', 'Whip Pan', 'Glitch'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setInterpSettings({...interpSettings, transition: t})}
                                    className={`text-[11px] py-2.5 rounded-lg border transition-all font-medium ${interpSettings.transition === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-800">
                        {renderRangeSlider(
                            "Motion Strength", 
                            interpSettings.strength, 
                            0, 
                            100, 
                            (v) => setInterpSettings({...interpSettings, strength: v}), 
                            '%', 
                            "Interpolation velocity."
                        )}
                    </div>
                </div>
            )}
          </div>

          {/* Section: Prompting */}
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Wand2 className="w-3 h-3" /> Context Guide
            </h3>
            
            <div className="space-y-4">
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the movement, lighting, and atmosphere..."
                    className="w-full h-28 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none transition-all"
                />
                
                {/* Visual Style Selection */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Palette className="w-3 h-3" /> Visual Style
                        </label>
                    </div>
                    <select 
                        value={videoStyle}
                        onChange={(e) => setVideoStyle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500/50 transition-colors"
                    >
                        {VIDEO_STYLES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                
                {/* Negative Prompt */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <button 
                        onClick={() => setShowNegative(!showNegative)}
                        className="flex items-center justify-between w-full text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                    >
                        <span className="flex items-center gap-2"><XCircle className="w-3 h-3" /> Negative Prompt</span>
                        {showNegative ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    
                    {showNegative && (
                        <textarea 
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="What to avoid (e.g., blurry, shaky, distortion)..."
                            className="w-full h-16 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 mt-3 outline-none focus:border-red-500/50 transition-colors resize-none"
                        />
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* Generate Button (Footer - Sticky) */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0 z-30">
            <button 
                onClick={handleGenerate}
                disabled={isGenerating || (mode === 'camera_motion' && !singleImage) || (mode === 'frame_interpolation' && (!frameStart || !frameEnd))}
                className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
            >
                {isGenerating ? (
                    <>
                        <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-base">Processing...</span>
                    </>
                ) : (
                    <>
                        <VideoIcon className="w-5 h-5" />
                        <span className="text-base">Generate Video</span>
                    </>
                )}
            </button>
            <div className="text-center mt-4">
                 <span className="text-[10px] text-slate-500 font-mono">Nano Banana Pro Model (Veo-3.1)</span>
            </div>
        </div>
      </div>
    </div>
  );
};
