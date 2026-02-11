
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { GeminiService, ChatMessage, QuizQuestion, Flashcard, LiveClient } from '../services/gemini';
import { 
    DocumentTextIcon, 
    MicrophoneIcon, 
    PhotoIcon, 
    AcademicCapIcon, 
    BookOpenIcon, 
    PencilSquareIcon, 
    PaperAirplaneIcon, 
    RectangleStackIcon, 
    SparklesIcon, 
    Bars3BottomLeftIcon, 
    UserCircleIcon,
    ClipboardIcon, 
    CheckIcon, 
    PhoneIcon,
    XMarkIcon, 
    ArrowUpTrayIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    InboxArrowDownIcon,
    ArrowDownTrayIcon,
    MinusIcon,
    PlusIcon,
    MoonIcon,
    SunIcon,
    GlobeAltIcon,
    VideoCameraIcon,
    PaintBrushIcon,
    ArrowPathIcon,
    LightBulbIcon,
    PuzzlePieceIcon,
    PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneSolid, PaperAirplaneIcon as PaperAirplaneSolid } from '@heroicons/react/24/solid';
import { QuizInterface } from './QuizInterface';
import { FlashcardInterface } from './FlashcardInterface';
import { FeedbackSection } from './FeedbackSection';
import { ProfileSection } from './ProfileSection';
import { NotesSection } from './NotesSection';
import { VideoStudio } from './VideoStudio';

type ViewMode = 'summary' | 'transcript' | 'assistant' | 'images' | 'quiz' | 'study' | 'notes' | 'flashcards' | 'feedback' | 'profile' | 'video';

interface WorkspaceProps {
    transcript: string | null;
    summary: string | null;
    onSummarize: (type: 'brief' | 'detailed' | 'key_terms') => void;
    isSummarizing: boolean;
    resources: any[] | null;
    onReset: () => void;
    fileName: string;
    onSeek?: (time: number) => void;
    initialMode?: ViewMode;
    initialImage?: string | null;
    initialMessage?: string | null;
    theme?: 'dark' | 'light';
    toggleTheme?: () => void;
    onGetResources?: () => void;
    isFetchingResources?: boolean;
    onError?: (message: string) => void;
}

// --- Specific Skeleton Components ---

const GenerationProgress = ({ label }: { label: string }) => (
    <div className="w-full max-w-md mx-auto space-y-3">
        <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
            <span>{label}</span>
            <span className="animate-pulse">Processing...</span>
        </div>
        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-[loading_2s_ease-in-out_infinite] w-1/3"></div>
        </div>
        <style>{`
            @keyframes loading {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(300%); }
            }
        `}</style>
    </div>
);

const SummarySkeleton = () => (
    <div className="bg-white/50 dark:bg-zinc-900/30 p-8 md:p-12 rounded-[50px] border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-pulse w-full">
        <div className="w-full max-w-md mx-auto mb-12">
             <GenerationProgress label="Analyzing Content & Generating Summary" />
        </div>
        <div className="space-y-6">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl w-1/3 mb-8"></div>
            <div className="space-y-3">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800/50 rounded-lg w-full"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800/50 rounded-lg w-full"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800/50 rounded-lg w-5/6"></div>
            </div>
            <div className="space-y-3 pt-6">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800/50 rounded-lg w-11/12"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800/50 rounded-lg w-full"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800/50 rounded-lg w-4/5"></div>
            </div>
            <div className="h-32 bg-zinc-100 dark:bg-zinc-800/30 rounded-2xl w-full mt-8"></div>
        </div>
    </div>
);

const QuizSkeleton = () => (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-pulse p-4">
        <div className="w-full max-w-md mx-auto mb-8">
             <GenerationProgress label="Constructing Adaptive Quiz" />
        </div>
        
        {/* Header */}
        <div className="bg-zinc-100 dark:bg-zinc-900/50 h-20 rounded-3xl w-full border border-zinc-200 dark:border-zinc-800"></div>
        
        {/* Question Card */}
        <div className="h-64 bg-zinc-100 dark:bg-zinc-900/50 rounded-[2.5rem] w-full border border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
             <div className="absolute inset-0 flex flex-col justify-center px-12 gap-6 items-center md:items-end opacity-50">
                 <div className="h-4 w-24 bg-zinc-300 dark:bg-zinc-700 rounded-lg"></div>
                 <div className="h-8 w-3/4 bg-zinc-300 dark:bg-zinc-700 rounded-xl"></div>
                 <div className="h-8 w-1/2 bg-zinc-300 dark:bg-zinc-700 rounded-xl"></div>
             </div>
        </div>
        
        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border border-zinc-200 dark:border-zinc-800"></div>
            ))}
        </div>
    </div>
);

const FlashcardSkeleton = () => (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-pulse mt-10">
         <div className="w-full max-w-md mx-auto mb-12">
             <GenerationProgress label="Extracting Key Concepts" />
        </div>
        <div className="w-full max-w-2xl aspect-[16/10] bg-zinc-100 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-lg">
             <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-50">
                <div className="w-32 h-4 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                <div className="w-64 h-8 rounded-xl bg-zinc-300 dark:bg-zinc-700"></div>
             </div>
        </div>
        <div className="flex gap-4 mt-8">
            <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
        </div>
    </div>
);

const ImagesSkeleton = () => (
    <div className="w-full h-full p-8 animate-pulse">
        <div className="w-full max-w-md mx-auto mb-12">
             <GenerationProgress label="Generating Visual Context" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
             {[1, 2].map(i => (
                 <div key={i} className="aspect-[4/3] rounded-3xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <PhotoIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
                 </div>
             ))}
        </div>
    </div>
);

const StudySkeleton = () => (
    <div className="w-full max-w-3xl mx-auto p-8 animate-pulse">
        <div className="w-full max-w-md mx-auto mb-12">
             <GenerationProgress label="Structuring Study Plan" />
        </div>
        <div className="space-y-8">
            <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-3/4"></div>
            <div className="space-y-4">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
            </div>
            <div className="h-48 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl w-full"></div>
            <div className="space-y-4">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-4/5"></div>
            </div>
        </div>
    </div>
);

// --- State Persistence Key ---
const WORKSPACE_PREFS_KEY = 'svu_ai_workspace_prefs_v2';

export const Workspace: React.FC<WorkspaceProps> = ({ 
    transcript, 
    summary, 
    onSummarize, 
    isSummarizing, 
    resources, 
    onReset, 
    fileName, 
    onSeek, 
    initialMode, 
    initialImage, 
    initialMessage, 
    theme, 
    toggleTheme, 
    onGetResources, 
    isFetchingResources,
    onError
}) => {
    
    // 1. Load Saved Preferences from LocalStorage on Mount
    const savedPrefs = useMemo(() => {
        try {
            const saved = localStorage.getItem(WORKSPACE_PREFS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    }, []);

    // 2. Initialize State with priority logic: 
    //    If initialMode is provided (e.g., uploading an image forces 'images' mode), use it.
    //    Otherwise, fall back to saved preferences, then default to 'summary'.
    const [mode, setMode] = useState<ViewMode>(() => {
        if (initialMode && initialMode !== 'summary') return initialMode;
        return (savedPrefs.mode as ViewMode) || initialMode || 'summary';
    });
    
    const [fontSize, setFontSize] = useState<number>(savedPrefs.fontSize || 18);
    const [useSearch, setUseSearch] = useState<boolean>(savedPrefs.useSearch || false);
    const [searchTerm, setSearchTerm] = useState<string>(savedPrefs.searchTerm || '');

    // 3. Persist UI Preferences whenever they change
    useEffect(() => {
        const prefs = {
            mode,
            fontSize,
            useSearch,
            searchTerm
        };
        localStorage.setItem(WORKSPACE_PREFS_KEY, JSON.stringify(prefs));
    }, [mode, fontSize, useSearch, searchTerm]);

    const [assistantState, setAssistantState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [assistantHistory, setAssistantHistory] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    
    // Live Mode State
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [liveError, setLiveError] = useState<string | null>(null);
    const liveClientRef = useRef<LiveClient | null>(null);
    const inputAudioCtxRef = useRef<AudioContext | null>(null);
    const outputAudioCtxRef = useRef<AudioContext | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingRef = useRef(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

    // Transcript View State
    const [isCopiedTranscript, setIsCopiedTranscript] = useState(false);

    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [studyGuide, setStudyGuide] = useState<string | null>(null);
    const [isGeneratingStudy, setIsGeneratingStudy] = useState(false);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

    // Contextual Images State
    const [generatedContextImages, setGeneratedContextImages] = useState<string[]>([]);
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);

    useEffect(() => {
        // Initialize history
        if (assistantHistory.length === 0) {
            const baseHistory: ChatMessage[] = [];
            
            // If transcript exists, AI welcomes based on it
            if (transcript) {
                 baseHistory.push({
                    role: 'model',
                    text: `أهلاً بك! لقد قمت بتحليل المحاضرة "${fileName}" بنجاح. أنا جاهز لمناقشتها معك الآن. ماذا تريد أن تفهم أولاً؟`,
                    timestamp: new Date()
                });
            } else {
                 // Generic Welcome if chat-only mode
                 baseHistory.push({
                    role: 'model',
                    text: 'أهلاً بك زميلي! أنا هيدرا، رفيقك الأكاديمي. كيف يمكنني مساعدتك في دراستك اليوم؟',
                    timestamp: new Date()
                });
            }

            if (initialMessage) {
                baseHistory.push({ role: 'user', text: initialMessage, timestamp: new Date() });
                setAssistantState('processing');
            }

            setAssistantHistory(baseHistory);
        }
    }, [transcript, fileName, initialMessage]);

    useEffect(() => {
        const lastMsg = assistantHistory[assistantHistory.length - 1];
        if (lastMsg?.role === 'user' && assistantState === 'processing') {
            const fetchResponse = async () => {
                try {
                    const response = await GeminiService.sendChatMessage(assistantHistory, lastMsg.text, transcript, useSearch);
                    setAssistantHistory(prev => [...prev, { role: 'model', text: response.text, sources: response.sources, timestamp: new Date() }]);
                    setAssistantState('idle');
                    await speakResponse(response.text);
                } catch (e: any) {
                    setAssistantState('idle');
                    let errorMsg = e.message || 'حدث خطأ غير متوقع.';
                    if (errorMsg.includes('429')) errorMsg = "تجاوزت الحد المسموح من الطلبات. يرجى الانتظار قليلاً.";
                    
                    setAssistantHistory(prev => [...prev, { 
                        role: 'model', 
                        text: `⚠️ ${errorMsg}`, 
                        timestamp: new Date() 
                    }]);
                }
            };
            fetchResponse();
        }
    }, [assistantHistory, assistantState, transcript, useSearch]);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [assistantHistory, assistantState]);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        });
    };

    const handleTranscriptCopy = () => {
        if (!transcript) return;
        navigator.clipboard.writeText(transcript).then(() => {
            setIsCopiedTranscript(true);
            setTimeout(() => setIsCopiedTranscript(false), 2000);
        });
    };

    const handleTranscriptDownload = () => {
        if (!transcript) return;
        const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${fileName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // --- Standard Chat Audio ---
    const playAudioQueue = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        isPlayingRef.current = true;
        const base64Audio = audioQueueRef.current.shift();
        if (base64Audio) {
            try {
                const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
                setAssistantState('speaking');
                audio.onended = () => {
                    isPlayingRef.current = false;
                    if (audioQueueRef.current.length === 0) setAssistantState('idle');
                    else playAudioQueue();
                };
                await audio.play();
            } catch (e) {
                isPlayingRef.current = false;
                setAssistantState('idle');
            }
        }
    };

    const speakResponse = async (text: string) => {
        try {
            const audioBase64 = await GeminiService.generateSpeech(text);
            audioQueueRef.current.push(audioBase64);
            playAudioQueue();
        } catch (e) {
            setAssistantState('idle');
        }
    };

    const handleTextSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || assistantState === 'processing') return;
        
        const text = inputText;
        setInputText('');
        if (chatInputRef.current) chatInputRef.current.style.height = 'auto';

        setAssistantState('processing');
        const newHistory = [...assistantHistory, { role: 'user', text, timestamp: new Date() } as ChatMessage];
        setAssistantHistory(newHistory);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTextSubmit();
        }
    };

    const handleMicrophoneError = (error: any) => {
        let errorMessage = "حدث خطأ غير متوقع أثناء الوصول للميكروفون.";
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = "تم رفض الوصول للميكروفون. يرجى السماح بالوصول من إعدادات المتصفح.";
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = "لم يتم العثور على ميكروفون. يرجى التحقق من توصيل الجهاز.";
        }
        
        setAssistantState('idle');
        setAssistantHistory(prev => [...prev, { 
            role: 'model', 
            text: `⚠️ ${errorMessage}`, 
            timestamp: new Date() 
        }]);
    };

    const toggleVoice = async () => {
        if (assistantState === 'idle') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;
                audioChunksRef.current = [];
                recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                recorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        if (typeof reader.result === 'string') {
                            setAssistantState('processing');
                            try {
                                const userText = await GeminiService.transcribeAudio(reader.result.split(',')[1], 'audio/webm');
                                if (!userText.trim()) { setAssistantState('idle'); return; }
                                const newHistory = [...assistantHistory, { role: 'user', text: userText, timestamp: new Date() } as ChatMessage];
                                setAssistantHistory(newHistory);
                            } catch (e: any) { 
                                setAssistantState('idle');
                                setAssistantHistory(prev => [...prev, { role: 'model', text: `⚠️ فشل تحويل الصوت: ${e.message}`, timestamp: new Date() }]);
                            }
                        }
                    };
                    stream.getTracks().forEach(track => track.stop());
                };
                recorder.start();
                setAssistantState('listening');
            } catch (e) { handleMicrophoneError(e); }
        } else if (assistantState === 'listening') {
            mediaRecorderRef.current?.stop();
        }
    };

    // --- Live Mode Logic ---
    const startLiveSession = async () => {
        setIsLiveMode(true);
        setLiveStatus('connecting');
        setLiveError(null);

        liveClientRef.current = new LiveClient();
        inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputNodeRef.current = outputAudioCtxRef.current.createGain();
        outputNodeRef.current.connect(outputAudioCtxRef.current.destination);
        nextStartTimeRef.current = 0;
        scheduledSourcesRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            liveClientRef.current.connect({
                onOpen: () => {
                    setLiveStatus('connected');
                    if (!inputAudioCtxRef.current) return;
                    if (inputAudioCtxRef.current.state === 'suspended') inputAudioCtxRef.current.resume();

                    const source = inputAudioCtxRef.current.createMediaStreamSource(stream);
                    const processor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
                    
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcm16 = LiveClient.floatTo16BitPCM(inputData);
                        const base64 = LiveClient.arrayBufferToBase64(pcm16);
                        const currentSampleRate = inputAudioCtxRef.current?.sampleRate || 16000;
                        liveClientRef.current?.send(base64, currentSampleRate);
                    };

                    source.connect(processor);
                    processor.connect(inputAudioCtxRef.current.destination);
                },
                onMessage: async (base64Audio) => {
                    if (!outputAudioCtxRef.current || !outputNodeRef.current) return;
                    if (outputAudioCtxRef.current.state === 'suspended') outputAudioCtxRef.current.resume();

                    const audioData = LiveClient.base64ToArrayBuffer(base64Audio);
                    const float32Data = new Float32Array(audioData.byteLength / 2);
                    const dataView = new DataView(audioData);
                    
                    for (let i = 0; i < float32Data.length; i++) {
                        float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
                    }

                    const buffer = outputAudioCtxRef.current.createBuffer(1, float32Data.length, 24000);
                    buffer.getChannelData(0).set(float32Data);

                    const source = outputAudioCtxRef.current.createBufferSource();
                    source.buffer = buffer;
                    source.connect(outputNodeRef.current);
                    source.onended = () => { scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== source); };
                    scheduledSourcesRef.current.push(source);

                    const currentTime = outputAudioCtxRef.current.currentTime;
                    if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += buffer.duration;
                },
                onInterrupted: () => {
                    scheduledSourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
                    scheduledSourcesRef.current = [];
                    if (outputAudioCtxRef.current) nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
                },
                onClose: () => { stopLiveSession(); },
                onError: (e) => {
                    console.error("Live Error", e);
                    setLiveError("انقطع الاتصال بالخادم.");
                    setTimeout(() => stopLiveSession(), 2000);
                }
            });
        } catch (e: any) {
            setLiveError("تعذر الوصول للميكروفون.");
            setTimeout(() => stopLiveSession(), 2000);
        }
    };

    const stopLiveSession = async () => {
        const client = liveClientRef.current;
        liveClientRef.current = null;
        if (client) await client.disconnect();

        scheduledSourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
        scheduledSourcesRef.current = [];

        if (inputAudioCtxRef.current) { try { await inputAudioCtxRef.current.close(); } catch(e) {} inputAudioCtxRef.current = null; }
        if (outputAudioCtxRef.current) { try { await outputAudioCtxRef.current.close(); } catch(e) {} outputAudioCtxRef.current = null; }

        setLiveStatus('disconnected');
        setLiveError(null);
        setIsLiveMode(false);
    };

    // --- Quiz & Study Handlers ---
    const handleGenerateQuiz = async () => {
        if (!transcript && !fileName) return; 
        setIsGeneratingQuiz(true);
        try {
            const textToUse = transcript || " "; 
            const q = await GeminiService.generateQuiz(textToUse);
            setQuizQuestions(q);
        } catch (e: any) {
            console.error(e);
            if (onError) onError("فشل توليد الاختبار. يرجى المحاولة لاحقاً.");
        } finally { setIsGeneratingQuiz(false); }
    };

    const handleGenerateStudy = async () => {
        if (!transcript) return;
        setIsGeneratingStudy(true);
        try {
            const guide = await GeminiService.analyzeStudyFocus(transcript);
            setStudyGuide(guide);
        } catch (e: any) {
            if (onError) onError("فشل تحليل خطة الدراسة.");
        } finally { setIsGeneratingStudy(false); }
    };

    const handleGenerateFlashcards = async () => {
        if (!transcript) return;
        setIsGeneratingFlashcards(true);
        try {
            const cards = await GeminiService.generateFlashcards(transcript);
            setFlashcards(cards);
        } catch (e: any) {
            if (onError) onError("فشل توليد بطاقات الذاكرة.");
        } finally { setIsGeneratingFlashcards(false); }
    };

    const handleGenerateContextImages = async () => {
        setIsGeneratingImages(true);
        try {
            const prompt = `Create a minimal, abstract educational illustration representing the concept of: ${fileName.replace(/\.[^/.]+$/, "")}. Use soft blue and geometric shapes.`;
            const imgs = await GeminiService.generateImages(prompt, '1:1', 'vector art', 'text, blurry, photo');
            setGeneratedContextImages(imgs);
        } catch (e: any) {
            console.error("Image generation failed", e);
            if (onError) onError("فشل توليد الصور. يرجى المحاولة لاحقاً.");
        } finally {
            setIsGeneratingImages(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row overflow-hidden font-cairo transition-colors duration-500" dir="rtl">
            {/* Sidebar */}
            <div className="w-full md:w-28 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border-l border-zinc-200 dark:border-zinc-800 flex md:flex-col items-center p-2 md:p-4 gap-2 md:gap-6 shrink-0 overflow-x-auto md:overflow-y-auto scrollbar-hide z-50">
                <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center shrink-0 hidden md:flex mb-6">
                   <span className="font-black text-white text-2xl">H</span>
                </div>
                <div className="flex md:flex-col gap-4 w-full">
                    <NavButton active={mode === 'summary'} onClick={() => setMode('summary')} icon={DocumentTextIcon} label="الملخص" />
                    <NavButton active={mode === 'transcript'} onClick={() => setMode('transcript')} icon={Bars3BottomLeftIcon} label="النص" />
                    <NavButton active={mode === 'video'} onClick={() => setMode('video')} icon={VideoCameraIcon} label="Studio" />
                    <NavButton active={mode === 'study'} onClick={() => setMode('study')} icon={BookOpenIcon} label="الدراسة" />
                    <NavButton active={mode === 'quiz'} onClick={() => setMode('quiz')} icon={AcademicCapIcon} label="الاختبار" />
                    <NavButton active={mode === 'flashcards'} onClick={() => setMode('flashcards')} icon={RectangleStackIcon} label="البطاقات" />
                    <NavButton active={mode === 'assistant'} onClick={() => setMode('assistant')} icon={MicrophoneIcon} label="المساعد" />
                    <NavButton active={mode === 'images'} onClick={() => setMode('images')} icon={PhotoIcon} label="الرسوم" />
                    <NavButton active={mode === 'notes'} onClick={() => setMode('notes')} icon={PencilSquareIcon} label="الدعم" />
                    <NavButton active={mode === 'feedback'} onClick={() => setMode('feedback')} icon={InboxArrowDownIcon} label="ملاحظات" />
                </div>
                <div className="mt-auto flex flex-col items-center gap-4">
                    {toggleTheme && (
                        <button onClick={toggleTheme} className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white transition-all shadow-sm">
                            {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                        </button>
                    )}
                    <NavButton active={mode === 'profile'} onClick={() => setMode('profile')} icon={UserCircleIcon} label="حسابي" />
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden ${mode === 'video' ? 'bg-black' : 'bg-dot-grid'}`}>
                
                {mode !== 'video' && (
                    transcript ? (
                        <div className="px-6 py-2 bg-blue-50 dark:bg-blue-600/10 border-b border-blue-200 dark:border-blue-500/20 flex items-center justify-between text-[10px] font-bold">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <SparklesIcon className="w-3 h-3" />
                                <span>سياق المحاضرة النشط: {fileName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-500">
                                <span>الذكاء الاصطناعي متصل بالنص الحالي</span>
                            </div>
                        </div>
                    ) : (
                        <div className="px-6 py-2 bg-white/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[10px] font-bold">
                            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                                <MicrophoneIcon className="w-3 h-3" />
                                <span>وضع الدردشة الحرة</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-600">
                                <span>لم يتم رفع محاضرة</span>
                            </div>
                        </div>
                    )
                )}

                <div key={mode} className={`h-full w-full flex flex-col overflow-y-auto scrollbar-hide animate-in fade-in duration-500 ${mode === 'video' ? 'overflow-hidden' : ''}`}>
                    
                    {mode === 'summary' && (
                        <div className="h-full p-8 max-w-5xl mx-auto w-full">
                            <h2 className="text-4xl font-black mb-10 text-zinc-900 dark:text-white">ملخص المحاضرة</h2>
                            {isSummarizing ? (
                                <SummarySkeleton />
                            ) : !summary ? (
                                <div className="space-y-6 bg-white/50 dark:bg-zinc-900/50 p-10 rounded-[40px] border border-zinc-200 dark:border-zinc-800 text-center shadow-lg dark:shadow-none">
                                    <p className="text-zinc-600 dark:text-zinc-400 text-xl mb-6">اختر مستوى التفاصيل المطلوب للتلخيص:</p>
                                    <div className="flex flex-wrap gap-4 justify-center">
                                        <ActionButton label="ملخص موجز" onClick={() => onSummarize('brief')} loading={isSummarizing} />
                                        <ActionButton label="ملخص تفصيلي" onClick={() => onSummarize('detailed')} loading={isSummarizing} />
                                    </div>
                                    {!transcript && (
                                         <p className="text-red-400/50 text-xs mt-4">يرجى رفع محاضرة أولاً أو الانتقال للمساعد لإجراء محادثة حرة.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white/50 dark:bg-zinc-900/30 p-12 rounded-[50px] border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                                    <div className="prose prose-lg md:prose-xl dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200">
                                        <ReactMarkdown>{summary}</ReactMarkdown>
                                    </div>
                                    <div className="mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-8">
                                        <h3 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
                                            <GlobeAltIcon className="w-6 h-6 text-blue-500" />
                                            المصادر ذات الصلة
                                        </h3>
                                        {!resources || resources.length === 0 ? (
                                            <div className="text-center py-6 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
                                                <p className="text-zinc-500 mb-4 text-sm">لم يتم البحث عن مصادر خارجية بعد.</p>
                                                <button 
                                                    onClick={onGetResources} 
                                                    disabled={isFetchingResources}
                                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isFetchingResources ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                            <span>جاري البحث...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <MagnifyingGlassIcon className="w-5 h-5" />
                                                            <span>البحث عن مصادر خارجية</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4 md:grid-cols-2">
                                                {resources.map((res, idx) => (
                                                    <a key={idx} href={res.uri} target="_blank" rel="noopener noreferrer" className="block p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all group">
                                                        <h4 className="font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-500 transition-colors line-clamp-1 mb-1">{res.title}</h4>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate font-mono">{res.uri}</p>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'transcript' && (
                        <div className="h-full flex flex-col p-6 lg:p-10 max-w-6xl mx-auto w-full">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-4xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                                    <Bars3BottomLeftIcon className="w-10 h-10 text-blue-500" />
                                    النص المفرغ
                                </h2>
                                {transcript && (
                                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
                                        <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" title="تصغير الخط"><MinusIcon className="w-4 h-4" /></button>
                                        <span className="w-8 text-center text-xs font-mono text-zinc-500">{fontSize}px</span>
                                        <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" title="تكبير الخط"><PlusIcon className="w-4 h-4" /></button>
                                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
                                        <button onClick={handleTranscriptCopy} className="p-2 text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="نسخ النص">{isCopiedTranscript ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}</button>
                                        <button onClick={handleTranscriptDownload} className="p-2 text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="تحميل كملف نصي"><ArrowDownTrayIcon className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>
                            {transcript ? (
                                <div className="flex-1 flex flex-col gap-4 min-h-0">
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input 
                                            type="text" 
                                            value={searchTerm} 
                                            onChange={(e) => setSearchTerm(e.target.value)} 
                                            placeholder="بحث في النص..." 
                                            className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 pr-12 pl-4 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                                        />
                                    </div>
                                    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-y-auto p-8 lg:p-12 relative flex-1 min-h-0">
                                        <div className="text-zinc-700 dark:text-zinc-300 leading-loose font-medium whitespace-pre-wrap transition-all duration-200" style={{ fontSize: `${fontSize}px` }}>
                                            {searchTerm ? transcript.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, i) => part.toLowerCase() === searchTerm.toLowerCase() ? <span key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-yellow-800 dark:text-yellow-200 rounded px-0.5">{part}</span> : part) : transcript}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-10 rounded-[40px] shadow-2xl flex flex-col items-center justify-center py-20">
                                    <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6"><DocumentTextIcon className="w-10 h-10 text-zinc-500 dark:text-zinc-600" /></div>
                                    <p className="text-zinc-500 text-lg mb-6">لم يتم رفع أي محاضرة بعد.</p>
                                    <button onClick={onReset} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20"><ArrowUpTrayIcon className="w-5 h-5" /> رفع محاضرة الآن</button>
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'quiz' && (
                        <div className="h-full flex flex-col items-center justify-center p-8 max-w-5xl mx-auto w-full">
                            {quizQuestions.length > 0 ? (
                                <QuizInterface questions={quizQuestions} onReset={() => setQuizQuestions([])} />
                            ) : (
                                <div className="text-center space-y-8 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
                                    <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-[32px] flex items-center justify-center mx-auto shadow-xl border border-zinc-200 dark:border-zinc-700">
                                        <AcademicCapIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white">اختبار المعلومات</h2>
                                        <p className="text-zinc-500 text-lg leading-relaxed font-medium">
                                            سيقوم الذكاء الاصطناعي بتوليد اختبار تفاعلي من محتوى المحاضرة لقياس مدى فهمك.
                                        </p>
                                    </div>
                                    
                                    {isGeneratingQuiz ? (
                                        <QuizSkeleton />
                                    ) : (
                                        <button 
                                            onClick={handleGenerateQuiz}
                                            disabled={(!transcript && !fileName)}
                                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <SparklesIcon className="w-6 h-6" />
                                            <span>بدء الاختبار الآن</span>
                                        </button>
                                    )}

                                    {!transcript && !fileName && (
                                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-4 rounded-xl text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-center gap-2">
                                            <ExclamationTriangleIcon className="w-5 h-5" />
                                            <span>يرجى رفع محاضرة أولاً لتوليد الاختبار.</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'assistant' && (
                        <div className="h-full flex flex-col relative">
                            <div className="absolute top-4 left-4 z-20 flex flex-col md:flex-row gap-2 items-end md:items-center">
                                {!isLiveMode && (
                                    <>
                                        <button onClick={() => setUseSearch(!useSearch)} className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all border ${useSearch ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/20' : 'bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}>
                                            <MagnifyingGlassIcon className="w-4 h-4" /><span className="text-sm font-bold">بحث Google</span>
                                            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${useSearch ? 'bg-emerald-800 justify-end' : 'bg-zinc-200 dark:bg-zinc-950 justify-start'}`}><div className="w-3 h-3 rounded-full bg-white shadow-sm" /></div>
                                        </button>
                                        <button onClick={startLiveSession} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg transition-all border border-indigo-400/20"><PhoneIcon className="w-4 h-4" /><span className="text-sm font-bold">مكالمة مباشرة (Native Audio)</span></button>
                                    </>
                                )}
                            </div>
                            {isLiveMode ? (
                                <div className="flex-1 flex flex-col items-center justify-center bg-white/95 dark:bg-black/95 backdrop-blur-xl absolute inset-0 z-30 animate-in fade-in duration-300">
                                    <div className={`absolute top-8 px-4 py-2 rounded-full border flex items-center gap-2 text-sm font-bold ${
                                        liveStatus === 'connected' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                        liveStatus === 'connecting' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                                        'bg-red-500/10 border-red-500/20 text-red-500'
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full ${
                                            liveStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                                            liveStatus === 'connecting' ? 'bg-yellow-500 animate-bounce' :
                                            'bg-red-50'
                                        }`} />
                                        <span className="uppercase tracking-wider">
                                            {liveStatus === 'connected' ? 'Connected' : 
                                            liveStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                                        </span>
                                    </div>
                                    <div className={`w-72 h-72 rounded-full border-[6px] flex items-center justify-center transition-all duration-700 relative 
                                        ${liveStatus === 'connected' 
                                            ? 'border-indigo-500 shadow-[0_0_120px_rgba(99,102,241,0.4)] scale-110' 
                                            : liveError 
                                                ? 'border-red-500 bg-red-500/5' 
                                                : 'border-zinc-200 dark:border-zinc-800'
                                        }`}>
                                        {liveStatus === 'connected' && (
                                            <>
                                                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30 opacity-0 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30 opacity-0 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]"></div>
                                            </>
                                        )}
                                        <div className="text-center z-10 p-6 flex flex-col items-center">
                                            {liveError ? (
                                                <div className="flex flex-col items-center text-red-500 animate-in zoom-in-50 duration-300">
                                                    <ExclamationTriangleIcon className="w-16 h-16 mb-4" />
                                                    <span className="font-bold text-xl mb-2">Connection Error</span>
                                                    <p className="text-sm text-red-400/80 max-w-[200px] leading-relaxed">{liveError}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {liveStatus === 'connecting' && (
                                                        <div className="flex flex-col items-center text-zinc-400">
                                                            <div className="w-12 h-12 border-4 border-zinc-300 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                                                            <span className="font-bold text-lg animate-pulse">Establishing Link...</span>
                                                        </div>
                                                    )}
                                                    {liveStatus === 'connected' && (
                                                        <div className="flex flex-col items-center">
                                                            <div className="flex gap-1 mb-6 h-8 items-center">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <div key={i} className="w-1.5 bg-indigo-500 rounded-full animate-[music-bar_1s_ease-in-out_infinite]" style={{ height: '30%', animationDelay: `${i * 0.1}s` }} />
                                                                ))}
                                                            </div>
                                                            <span className="block text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Listening</span>
                                                            <span className="text-sm text-indigo-500 mt-2 font-mono">Gemini 2.5 Flash Live</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-16 flex flex-col items-center gap-4">
                                        {liveError && (
                                            <button onClick={startLiveSession} className="px-6 py-3 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-full font-bold shadow-lg transition-all flex items-center gap-2">
                                                <ArrowPathIcon className="w-5 h-5" />
                                                Retry Connection
                                            </button>
                                        )}
                                        <button onClick={stopLiveSession} className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-xl transition-transform hover:scale-105 flex items-center gap-2">
                                            <XMarkIcon className="w-6 h-6" />
                                            End Session
                                        </button>
                                    </div>
                                    <style>{`@keyframes music-bar { 0%, 100% { height: 30%; } 50% { height: 100%; } }`}</style>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-48 scrollbar-hide pt-32 md:pt-16">
                                        {assistantHistory.map((msg, i) => (
                                            <div key={i} className={`flex w-full group ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                                                    <div className={`p-6 rounded-[32px] text-lg shadow-2xl leading-relaxed ${msg.role === 'user' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-white rounded-br-none' : 'bg-blue-600 text-white rounded-bl-none'}`}>
                                                        <div className={`prose prose-lg max-w-none ${msg.role === 'model' ? 'prose-invert' : 'dark:prose-invert'}`}>
                                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 px-2">
                                                        <button onClick={() => handleCopy(msg.text, i)} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">{copiedIndex === i ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-zinc-50 to-transparent dark:from-zinc-950 dark:to-transparent">
                                        <div className="max-w-4xl mx-auto flex gap-4 items-end">
                                            <button onClick={toggleVoice} className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shrink-0 ${assistantState === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`}><MicrophoneSolid className={`w-6 h-6 md:w-7 md:h-7 ${assistantState === 'listening' ? 'text-white' : 'text-zinc-700 dark:text-white'}`} /></button>
                                            <form onSubmit={handleTextSubmit} className="flex-1 relative">
                                                <textarea ref={chatInputRef} value={inputText} onChange={(e) => { setInputText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; }} onKeyDown={handleKeyDown} placeholder="Shift+Enter لسطر جديد..." className="w-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 rounded-3xl px-8 py-4 text-zinc-900 dark:text-white text-lg focus:border-blue-500 outline-none resize-none max-h-[200px] scrollbar-hide shadow-xl" rows={1} />
                                                <button type="submit" className="absolute left-4 bottom-3 text-blue-500 hover:text-blue-400 p-2"><PaperAirplaneSolid className="w-6 h-6 rotate-180" /></button>
                                            </form>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {mode === 'notes' && <NotesSection transcript={transcript} onUploadRequest={onReset} />}
                    {mode === 'feedback' && <FeedbackSection />}
                    
                    {mode === 'images' && (
                        <div className="h-full p-8 max-w-5xl mx-auto w-full">
                            {initialImage ? (
                                <div className="bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800">
                                    <img src={initialImage} alt="Uploaded" className="w-full h-auto max-h-[70vh] object-contain" />
                                    <div className="p-4 bg-black/50 text-white text-center">الصورة المرفوعة</div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center">
                                    <h2 className="text-3xl font-black mb-8 text-zinc-900 dark:text-white flex items-center gap-2">
                                        <PaintBrushIcon className="w-8 h-8 text-purple-500" />
                                        السياق البصري للمحاضرة
                                    </h2>
                                    
                                    {isGeneratingImages ? (
                                        <ImagesSkeleton />
                                    ) : generatedContextImages.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                            {generatedContextImages.map((img, idx) => (
                                                <div key={idx} className="rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl group relative">
                                                    <img src={img} alt={`Context ${idx}`} className="w-full h-64 object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold">تنزيل</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full space-y-6">
                                            <div className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-10 text-center shadow-lg">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                    <div className="aspect-[4/3] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
                                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                                        <LightBulbIcon className="w-12 h-12 text-yellow-400 mb-2 z-10" />
                                                        <span className="text-sm font-bold text-white z-10">المفاهيم الأساسية</span>
                                                        <div className="absolute bottom-0 w-full h-1 bg-yellow-400"></div>
                                                    </div>

                                                    <div className="aspect-[4/3] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
                                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10"></div>
                                                        <PuzzlePieceIcon className="w-12 h-12 text-blue-400 mb-2 z-10" />
                                                        <span className="text-sm font-bold text-white z-10">الربط المنطقي</span>
                                                        <div className="absolute bottom-0 w-full h-1 bg-blue-400"></div>
                                                    </div>

                                                    <div className="aspect-[4/3] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
                                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                                                        <PresentationChartLineIcon className="w-12 h-12 text-emerald-400 mb-2 z-10" />
                                                        <span className="text-sm font-bold text-white z-10">التحليل البياني</span>
                                                        <div className="absolute bottom-0 w-full h-1 bg-emerald-400"></div>
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-bold mb-4">السياق البصري الذكي</h3>
                                                <p className="text-zinc-500 mb-8 max-w-md mx-auto">
                                                    يمكن للذكاء الاصطناعي توليد لوحة مفاهيم بصرية (Concept Board) مخصصة لمحتوى محاضرتك "{fileName}" لمساعدتك على التذكر البصري.
                                                </p>
                                                
                                                {transcript ? (
                                                    <button 
                                                        onClick={handleGenerateContextImages}
                                                        className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-xl flex items-center gap-3 mx-auto"
                                                    >
                                                        <SparklesIcon className="w-5 h-5" />
                                                        <span>توليد سياق بصري (AI)</span>
                                                    </button>
                                                ) : (
                                                    <p className="text-red-400/60 text-sm">يرجى رفع محاضرة لتفعيل التوليد البصري.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'profile' && <ProfileSection />}
                    {mode === 'study' && (
                        <div className="p-8 max-w-5xl mx-auto w-full">
                            {!studyGuide ? (
                                <div className="text-center py-20">
                                    <BookOpenIcon className="w-20 h-20 text-purple-500 mx-auto mb-6" />
                                    {isGeneratingStudy ? (
                                         <StudySkeleton />
                                    ) : (
                                        <button onClick={handleGenerateStudy} disabled={isGeneratingStudy} className="px-8 py-4 bg-purple-600 rounded-2xl text-white font-bold shadow-xl">تحليل خطة الدراسة</button>
                                    )}
                                </div>
                            ) : (
                                <div className="prose prose-lg md:prose-xl dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200">
                                    <ReactMarkdown>{studyGuide}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                    {mode === 'flashcards' && (
                        <div className="p-8">
                            {flashcards.length === 0 ? (
                                isGeneratingFlashcards ? (
                                    <FlashcardSkeleton />
                                ) : (
                                    <button onClick={handleGenerateFlashcards} className="px-8 py-4 bg-green-600 rounded-2xl text-white font-bold mx-auto block shadow-xl">توليد البطاقات</button>
                                )
                            ) : (
                                <FlashcardInterface cards={flashcards} onReset={() => setFlashcards([])} />
                            )}
                        </div>
                    )}
                    
                    {mode === 'video' && (
                        <VideoStudio />
                    )}

                </div>
            </div>
        </div>
    );
};

const NavButton = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) => (
    <button 
        onClick={onClick}
        className={`w-full p-3 rounded-2xl flex flex-col md:flex-row items-center gap-3 transition-all duration-300 group ${
            active 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
        }`}
    >
        <Icon className={`w-6 h-6 md:w-5 md:h-5 ${active ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
        <span className={`text-[10px] md:text-xs font-bold ${active ? 'text-white' : ''}`}>{label}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full hidden md:block" />}
    </button>
);

const ActionButton = ({ label, onClick, loading }: { label: string; onClick: () => void; loading: boolean }) => (
    <button 
        onClick={onClick} 
        disabled={loading}
        className="px-6 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl text-zinc-700 dark:text-zinc-300 font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {loading ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-600 rounded-full animate-spin" /> : null}
        {label}
    </button>
);
