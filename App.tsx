
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { Hero } from './components/Hero';
import { InputArea } from './components/InputArea';
import { Workspace } from './components/Workspace';
import { AccessGate } from './components/AccessGate';
import { GeminiService, FileTooLargeError, UnsupportedFormatError, NetworkTimeoutError } from './services/gemini';
import { AudioPlayer } from './components/AudioPlayer';
import mammoth from 'mammoth';
import { ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// Config Constants - Updated to 9MB
const MAX_FILE_SIZE = 9 * 1024 * 1024; // 9MB
const CHUNK_THRESHOLD = 2 * 1024 * 1024; // 2MB

// Persistence Keys
const SESSION_KEY = 'hedra_active_session_v1';
const THEME_KEY = 'hedra_theme_pref';
const ACADEMIC_ID_KEY = 'hedra_academic_id';

// Enhanced Magic Numbers for signature detection
const FILE_SIGNATURES: { [key: string]: string } = {
  '25504446': 'application/pdf',
  '494433': 'audio/mpeg',
  'FFFB': 'audio/mpeg',
  'FFF3': 'audio/mpeg',
  '52494646': 'audio/wav',
  '504B0304': 'application/zip', // DOCX is a zip
  'D0CF11E0': 'application/msword', // Legacy DOC
  '00000018': 'audio/mp4', // M4A (ftyp)
  '00000020': 'audio/mp4',
  '00000014': 'audio/mp4',
  '4F676753': 'audio/ogg',
  '664C6143': 'audio/flac'
};

interface Notification {
  message: string;
  type: 'error' | 'success';
}

const NotificationToast = ({ message, type, onClose }: { message: string, type: 'error' | 'success', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm w-full px-4`}>
            <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                {type === 'error' ? <ExclamationTriangleIcon className="w-6 h-6 shrink-0" /> : <CheckCircleIcon className="w-6 h-6 shrink-0" />}
                <p className="text-sm font-bold flex-1">{message}</p>
                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><XMarkIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // Access Gate State
  const [academicId, setAcademicId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('idle'); 
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);
  const [initialViewMode, setInitialViewMode] = useState<'summary' | 'images' | 'assistant'>('summary');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [resources, setResources] = useState<any[] | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isFetchingResources, setIsFetchingResources] = useState(false);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  
  // Notification State
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const progressIntervalRef = useRef<any>(null);

  // Load Theme
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light';
    if (storedTheme) {
        setTheme(storedTheme);
    }
  }, []);

  // Check for Academic ID
  useEffect(() => {
    const storedId = localStorage.getItem(ACADEMIC_ID_KEY);
    if (storedId) {
        setAcademicId(storedId);
    }
  }, []);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleAccessVerify = (id: string) => {
    localStorage.setItem(ACADEMIC_ID_KEY, id);
    setAcademicId(id);
  };

  // --- Session Persistence ---
  // Load session on mount
  useEffect(() => {
    if (!academicId) return; // Only load session if authorized

    try {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const data = JSON.parse(savedSession);
        if (data.transcript && data.fileName) {
          setTranscript(data.transcript);
          setSummary(data.summary || null);
          setResources(data.resources || null);
          setFileName(data.fileName);
          // Create a dummy file object to trigger the UI state
          setFile(new File([], data.fileName));
          setProcessingStatus('ready');
          console.log("Session restored from local storage");
        }
      }
    } catch (e) {
      console.warn("Failed to restore session", e);
    }
  }, [academicId]);

  // Save session on updates
  useEffect(() => {
    if (processingStatus === 'ready' && transcript && fileName) {
      const sessionData = {
        transcript,
        summary,
        resources,
        fileName,
        timestamp: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
  }, [transcript, summary, resources, fileName, processingStatus]);

  const startProgressSimulation = (totalSeconds: number, startFrom: number = 0) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setProgress(startFrom);
    setEstimatedSeconds(totalSeconds);
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        // Cap at 95% until done
        const currentProgress = Math.min(Math.round(startFrom + (elapsed / totalSeconds) * (95 - startFrom)), 95);
        const remaining = Math.max(Math.round(totalSeconds - elapsed), 1);
        setProgress(currentProgress);
        setEstimatedSeconds(remaining);
    }, 500);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setProgress(100);
    setEstimatedSeconds(0);
  };

  const handleError = (message: string) => {
      setNotification({ message, type: 'error' });
  };

  const getFileSignature = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!e.target?.result) return resolve('');
        const uint = new Uint8Array(e.target.result as ArrayBuffer);
        let bytes: string[] = [];
        uint.forEach((byte) => bytes.push(byte.toString(16).toUpperCase().padStart(2, '0')));
        const hex = bytes.join('');
        resolve(hex);
      };
      reader.readAsArrayBuffer(file.slice(0, 4));
    });
  };

  // Chunked file reader for better performance with large files
  const readFileChunked = (file: File, onProgress: (percent: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const chunkSize = 1024 * 1024; // 1MB chunks
        const chunks = Math.ceil(file.size / chunkSize);
        let currentChunk = 0;
        const reader = new FileReader();
        const resultParts: ArrayBuffer[] = [];

        const readNextChunk = () => {
             const start = currentChunk * chunkSize;
             const end = Math.min(start + chunkSize, file.size);
             const blob = file.slice(start, end);
             reader.readAsArrayBuffer(blob);
        };

        reader.onload = (e) => {
            if (e.target?.result) {
                resultParts.push(e.target.result as ArrayBuffer);
                currentChunk++;
                
                // Reading is ~40% of the total "upload/processing" perceived time
                const percent = Math.round((currentChunk / chunks) * 40);
                onProgress(percent);
                
                if (currentChunk < chunks) {
                    // Yield to main thread to prevent UI freeze
                    setTimeout(readNextChunk, 0);
                } else {
                    // Combine chunks
                    const totalLen = resultParts.reduce((acc, b) => acc + b.byteLength, 0);
                    const fullBuffer = new Uint8Array(totalLen);
                    let offset = 0;
                    for (const part of resultParts) {
                        fullBuffer.set(new Uint8Array(part), offset);
                        offset += part.byteLength;
                    }
                    
                    // Convert to Base64 efficiently
                    let binary = '';
                    const bytes = fullBuffer;
                    const len = bytes.byteLength;
                    const B64_CHUNK = 0x8000; // 32k chunks for string conversion
                    for (let i = 0; i < len; i += B64_CHUNK) {
                        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + B64_CHUNK)));
                    }
                    resolve(window.btoa(binary));
                }
            }
        };
        
        reader.onerror = reject;
        readNextChunk();
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // Extract text from DOCX using mammoth
  const extractDocxText = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (e) {
        throw new Error("فشل استخراج النص من ملف Word. يرجى التأكد أن الملف غير تالف (DOCX فقط).");
    }
  };

  const handleTextSession = (text: string) => {
      const fakeFile = new File([], "دردشة نصية");
      setFile(fakeFile);
      setFileName("دردشة نصية");
      setProcessingStatus('ready');
      setInitialViewMode('assistant');
      setInitialMessage(text);
      setTranscript(null);
  };

  const processFile = async (selectedFile: File, type: 'lecture' | 'image') => {
    // 1. Validation Size
    if (selectedFile.size > MAX_FILE_SIZE) {
        handleError(`عذراً، حجم الملف (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB) يتجاوز الحد المسموح (9MB). يرجى استخدام ملف أصغر.`);
        return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setProcessingStatus('converting');
    setProgress(1);
    setEstimatedSeconds(20);
    setTranscript(null);
    setSummary(null);
    setResources(null);
    setInitialViewMode('summary');
    setUploadedImage(null);
    setInitialMessage(null);

    try {
        // 2. Type Detection via Signature
        const signature = await getFileSignature(selectedFile);
        
        // --- IMAGE FLOW ---
        if (type === 'image') {
            const base64Data = await fileToBase64(selectedFile);
            stopProgressSimulation();
            setProcessingStatus('ready');
            setInitialViewMode('images');
            setUploadedImage(`data:${selectedFile.type};base64,${base64Data}`);
            return;
        }

        // --- DOCUMENT/AUDIO FLOW ---
        let result = "";
        
        // Handle DOCX (Word)
        const isZip = signature.startsWith('504B0304');
        const isDocx = selectedFile.name.match(/\.docx$/i);
        const isDocLegacy = selectedFile.name.match(/\.doc$/i);
        const isPdf = selectedFile.type === 'application/pdf' || signature.startsWith('25504446');

        if (isDocLegacy && signature.startsWith('D0CF11E0')) {
             throw new UnsupportedFormatError("تنسيق .doc القديم غير مدعوم للمعالجة المباشرة. يرجى تحويل الملف إلى DOCX أو PDF.");
        }

        if (isDocx || (isZip && selectedFile.type.includes('document'))) {
             setProcessingStatus('extracting_doc');
             startProgressSimulation(10);
             const text = await extractDocxText(selectedFile);
             if (!text.trim()) throw new Error("الملف فارغ أو لا يحتوي على نصوص قابلة للقراءة.");
             result = text;
        } 
        else {
            // PDF or Audio
            let base64Data = "";
            
            // Use Chunked Reading for files > 2MB
            if (selectedFile.size > CHUNK_THRESHOLD) {
                setProcessingStatus('uploading_chunked');
                base64Data = await readFileChunked(selectedFile, (readPercent) => {
                    setProgress(readPercent);
                });
            } else {
                base64Data = await fileToBase64(selectedFile);
            }
            
            let mimeType = selectedFile.type;

            // Normalize Audio Mimes for Gemini
            if (selectedFile.name.toLowerCase().endsWith('.lrec')) {
                 mimeType = 'audio/lrec'; 
                 setProcessingStatus('deciphering_lrec');
            } else if (isPdf) {
                 mimeType = 'application/pdf';
                 setProcessingStatus('extracting_pdf');
            } else {
                 if (!mimeType.startsWith('audio/')) {
                     if (signature.startsWith('494433') || signature.startsWith('FFFB')) mimeType = 'audio/mpeg';
                     else if (signature.startsWith('52494646')) mimeType = 'audio/wav';
                     else if (signature.startsWith('000000')) mimeType = 'audio/mp4';
                 }
                 setAudioUrl(URL.createObjectURL(selectedFile));
                 setProcessingStatus('transcribing');
            }
            
            // Start simulation from where reading left off (approx 40%)
            startProgressSimulation(30, 40); 
            result = await GeminiService.transcribeAudio(base64Data, mimeType);
        }
        
        stopProgressSimulation();
        setTranscript(result);
        setProcessingStatus('ready');

    } catch (error: any) {
        console.error("Processing Error:", error);
        setProcessingStatus('error');
        stopProgressSimulation();
        
        let errorMessage = "فشلت عملية معالجة الملف.";
        if (error instanceof FileTooLargeError) errorMessage = error.message;
        else if (error instanceof UnsupportedFormatError) errorMessage = error.message;
        else if (error instanceof NetworkTimeoutError) errorMessage = error.message;
        else if (error.message) errorMessage = error.message;

        handleError(errorMessage);
        handleReset();
    }
  };

  const handleSummarize = async (type: 'brief' | 'detailed' | 'key_terms') => {
    if (!transcript) return;
    setIsSummarizing(true);
    setResources(null); // Reset resources when new summary is requested
    try {
        let plainText = transcript;
        try {
            const parsed = JSON.parse(transcript);
            if (Array.isArray(parsed)) plainText = parsed.map((item: any) => item.text).join(' ');
        } catch (e) {}

        const summaryText = await GeminiService.summarizeCourseContent(plainText, type);
        setSummary(summaryText);
    } catch (error: any) {
        handleError("فشل التلخيص: " + (error.message || "حدث خطأ غير متوقع"));
    } finally {
        setIsSummarizing(false);
    }
  };

  const handleGetResources = async () => {
    if (!summary) return;
    setIsFetchingResources(true);
    try {
        const related = await GeminiService.getRelatedResources(summary);
        setResources(related);
    } catch (error) {
        console.error("Failed to fetch resources", error);
        handleError("فشل في جلب المصادر. يرجى التحقق من الاتصال والمحاولة لاحقاً.");
    } finally {
        setIsFetchingResources(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAudioUrl(null);
    setTranscript(null);
    setSummary(null);
    setResources(null);
    setProcessingStatus('idle');
    setSeekTime(null);
    setUploadedImage(null);
    setInitialMessage(null);
    setFileName(undefined);
    setProgress(0);
    setEstimatedSeconds(0);
    localStorage.removeItem(SESSION_KEY); // Clear session on manual reset
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  // --- ACCESS GATING ---
  if (!academicId) {
      return (
        <div className="relative w-full h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-[#020204] transition-colors duration-500" dir="rtl">
            {/* Show Hero in background for aesthetics but block interaction */}
            <Hero theme={theme} toggleTheme={toggleTheme} />
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/10 dark:bg-black/40 backdrop-blur-md">
                <AccessGate onVerify={handleAccessVerify} />
            </div>
        </div>
      );
  }

  // --- MAIN APP (Authorized) ---
  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-[#020204] transition-colors duration-500" dir="rtl">
       {notification && <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
       {(!file || processingStatus !== 'ready') && <Hero theme={theme} toggleTheme={toggleTheme} />}
       <div className={`relative z-10 w-full h-full flex flex-col transition-all duration-700 ${file ? 'backdrop-blur-xl bg-white/40 dark:bg-black/40' : ''}`}>
          {file && processingStatus === 'ready' && (
              <div className="h-16 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 backdrop-blur-md flex items-center justify-between px-6 animate-in slide-in-from-top-full duration-500">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">H</div>
                      <h1 className="text-zinc-900 dark:text-zinc-100 font-bold font-orbitron tracking-wide hidden md:block">SVU AI STUDIO</h1>
                  </div>
                  <div className="flex items-center gap-4">
                      {audioUrl && (
                          <div className="w-64 hidden md:block" dir="ltr">
                              <AudioPlayer audioUrl={audioUrl} seekTo={seekTime} />
                          </div>
                      )}
                      <div className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded">
                          ID: {academicId}
                      </div>
                      <button 
                        onClick={handleReset}
                        className="px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
                      >
                        مشروع جديد
                      </button>
                  </div>
              </div>
          )}
          <div className="flex-1 overflow-hidden relative">
              {processingStatus !== 'ready' && (
                  <InputArea 
                      onFileSelect={processFile} 
                      onTextSubmit={handleTextSession}
                      isProcessing={processingStatus !== 'idle' && processingStatus !== 'ready' && processingStatus !== 'error'} 
                      statusMessage={
                          processingStatus === 'converting' ? 'جاري تهيئة الملف...' :
                          processingStatus === 'uploading_chunked' ? 'جاري قراءة الملف وتجزئته (تحسين الأداء)...' :
                          processingStatus === 'extracting_doc' ? 'جاري استخراج النصوص من المستند...' :
                          processingStatus === 'extracting_pdf' ? 'جاري تحليل ملف PDF...' :
                          processingStatus === 'deciphering_lrec' ? 'تحليل وفك تشفير تنسيق LREC...' :
                          processingStatus === 'normalizing' ? 'جاري تحسين الملف...' :
                          processingStatus === 'transcribing' ? 'جاري المعالجة الأكاديمية (Gemini 3 Multimodal)...' : 'جاري المعالجة...'
                      }
                      progress={progress}
                      estimatedSeconds={estimatedSeconds}
                      fileName={file?.name}
                  />
              )}
              {file && processingStatus === 'ready' && (
                  <Workspace 
                      transcript={transcript}
                      summary={summary}
                      onSummarize={handleSummarize}
                      isSummarizing={isSummarizing}
                      resources={resources}
                      onReset={handleReset}
                      fileName={fileName || file.name}
                      onSeek={setSeekTime}
                      initialMode={initialViewMode}
                      initialImage={uploadedImage}
                      initialMessage={initialMessage}
                      theme={theme}
                      toggleTheme={toggleTheme}
                      onGetResources={handleGetResources}
                      isFetchingResources={isFetchingResources}
                      onError={handleError}
                  />
              )}
          </div>
       </div>
    </div>
  );
};

export default App;
