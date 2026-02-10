
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useState, useRef } from 'react';
import { 
    PaperClipIcon, 
    PhotoIcon, 
    MicrophoneIcon, 
    PaperAirplaneIcon, 
    ArrowUpTrayIcon,
    ClockIcon,
    CpuChipIcon,
    StopIcon,
    PlusIcon
} from '@heroicons/react/24/solid';
import { Bold, Italic, List } from 'lucide-react';

interface InputAreaProps {
  onFileSelect: (file: File, type: 'lecture' | 'image') => void;
  onTextSubmit: (text: string) => void;
  isProcessing: boolean;
  statusMessage: string;
  progress: number;
  estimatedSeconds: number;
  fileName?: string;
}

export const InputArea: React.FC<InputAreaProps> = ({ 
  onFileSelect, 
  onTextSubmit,
  isProcessing, 
  statusMessage, 
  progress,
  estimatedSeconds,
  fileName 
}) => {
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // General File Handler (Audio/PDF/DOC)
  const handleLectureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        onFileSelect(e.target.files[0], 'lecture');
    }
  };

  // Image Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        onFileSelect(e.target.files[0], 'image');
    }
  };

  // Text Handler
  const handleSendText = () => {
    if (inputText.trim()) {
        onTextSubmit(inputText);
        setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendText();
      }
  };

  // Text Formatting
  const handleFormat = (type: 'bold' | 'italic' | 'list') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = inputText;
      
      let newText = text;
      let newCursorPos = end;

      if (type === 'bold') {
          const selected = text.substring(start, end);
          newText = text.substring(0, start) + '**' + selected + '**' + text.substring(end);
          newCursorPos = end + 4; 
          if (start === end) newCursorPos = start + 2; 
      } else if (type === 'italic') {
          const selected = text.substring(start, end);
          newText = text.substring(0, start) + '*' + selected + '*' + text.substring(end);
          newCursorPos = end + 2;
          if (start === end) newCursorPos = start + 1;
      } else if (type === 'list') {
          const beforeCursor = text.substring(0, start);
          const needsNewline = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');
          const prefix = needsNewline ? '\n- ' : '- ';
          newText = text.substring(0, start) + prefix + text.substring(end);
          newCursorPos = start + prefix.length;
      }

      setInputText(newText);
      
      requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
  };

  // Microphone Logic
  const toggleRecording = async () => {
      if (isRecording) {
          // Stop Recording
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          // Start Recording
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              mediaRecorderRef.current = recorder;
              audioChunksRef.current = [];

              recorder.ondataavailable = (event) => {
                  audioChunksRef.current.push(event.data);
              };

              recorder.onstop = () => {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  const audioFile = new File([audioBlob], "voice_recording.webm", { type: 'audio/webm' });
                  onFileSelect(audioFile, 'lecture');
                  
                  // Stop all tracks to release mic
                  stream.getTracks().forEach(track => track.stop());
              };

              recorder.start();
              setIsRecording(true);
          } catch (err) {
              console.error("Error accessing microphone:", err);
              alert("لا يمكن الوصول للميكروفون. يرجى التحقق من الصلاحيات.");
          }
      }
  };

  // Drag and Drop Handlers
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const isImage = file.type.startsWith('image/');
      onFileSelect(file, isImage ? 'image' : 'lecture');
    }
  }, [isProcessing, onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  }, [isProcessing]);

  return (
    <div 
        className={`fixed inset-0 flex flex-col items-center justify-end pb-12 px-4 transition-colors duration-500 ${isDragging ? 'bg-blue-900/20' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        dir="rtl"
    >
      {/* Visual Feedback for Dragging */}
      {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md p-8 rounded-3xl border-2 border-dashed border-blue-500 text-blue-500 dark:text-blue-400 flex flex-col items-center animate-bounce">
                  <ArrowUpTrayIcon className="w-12 h-12 mb-4" />
                  <h3 className="text-2xl font-bold">أفلت الملف هنا</h3>
              </div>
          </div>
      )}

      <div className="w-full max-w-3xl relative z-20 space-y-6">
        
        {/* Processing State */}
        {isProcessing && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-blue-500 blur-xl opacity-20" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                            <CpuChipIcon className="w-6 h-6 text-blue-500 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-zinc-900 dark:text-white font-bold text-lg leading-none mb-1">معالجة الذكاء الاصطناعي</h3>
                            <p className="text-zinc-500 text-xs font-mono uppercase tracking-tighter truncate max-w-[200px]">{fileName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">الوقت المتبقي</span>
                            <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-mono text-sm">
                                <ClockIcon className="w-4 h-4" />
                                <span>{estimatedSeconds}ث</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">التقدم</span>
                             <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono leading-none">{progress}%</div>
                        </div>
                    </div>
                </div>

                {/* Main Progress Bar */}
                <div className="relative h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700/50">
                    <div 
                        className="absolute inset-y-0 right-0 bg-gradient-to-l from-blue-600 to-blue-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        style={{ width: `${progress}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                         <span className="text-blue-600 dark:text-blue-100 font-bold text-sm">
                            {statusMessage}
                        </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-600">Gemini 3 Flash Multimodal</span>
                </div>
            </div>
        )}

        {/* Helper Text (Only if idle) */}
        {!isProcessing && (
            <div className="text-center space-y-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center justify-center p-1.5 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-full mb-4 shadow-sm">
                    <span className="px-3 py-1 bg-blue-600 rounded-full text-[10px] font-bold text-white">تحديث</span>
                    <span className="px-3 text-xs text-zinc-600 dark:text-zinc-400">دعم ملفات Word و PDF و الصوت (حتى 9MB)</span>
                </div>
            </div>
        )}

        {/* Chat Input Box */}
        <div className={`
            relative bg-white dark:bg-[#18181b] border transition-all duration-300 rounded-3xl shadow-2xl overflow-visible
            ${isProcessing ? 'border-blue-500/50 opacity-40 pointer-events-none grayscale' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20'}
            ${isRecording ? 'border-red-500 ring-1 ring-red-500/50 animate-pulse' : ''}
        `}>
            {/* Input Field */}
            <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "جاري الاستماع..." : "كيف فيني ساعدك اليوم زمييل..."}
                className="w-full bg-transparent text-zinc-900 dark:text-white placeholder-zinc-500 px-6 py-5 text-lg outline-none resize-none h-16 md:h-[72px] leading-relaxed font-cairo pr-16"
                style={{ minHeight: '60px' }}
                disabled={isProcessing || isRecording}
            />

            {/* Icons / Controls Row */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
                
                {/* Left Side: Attachment & Formatting */}
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center">
                        <button 
                            onClick={() => setShowAttachments(!showAttachments)}
                            className={`p-2.5 rounded-xl transition-all duration-200 ${showAttachments ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white rotate-45' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/50'}`}
                            disabled={isProcessing || isRecording}
                            title="إضافة مرفقات"
                        >
                            <PlusIcon className="w-6 h-6" />
                        </button>

                        {/* Popover Menu - Positioned Right-Aligned for RTL */}
                        <div className={`absolute bottom-full right-0 mb-4 flex flex-col gap-2 transition-all duration-300 origin-bottom-right z-50 ${showAttachments ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4 pointer-events-none'}`}>
                            {/* File Upload (Audio/PDF/DOC) */}
                            <button 
                                onClick={() => { fileInputRef.current?.click(); setShowAttachments(false); }}
                                className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 transition-all group whitespace-nowrap"
                            >
                                <div className="p-1.5 bg-blue-500/20 rounded-lg group-hover:bg-blue-500 transition-colors">
                                    <PaperClipIcon className="w-5 h-5 text-blue-500 dark:text-blue-400 group-hover:text-white" />
                                </div>
                                <span className="text-sm font-bold">ملف (Word, PDF, Audio)</span>
                            </button>

                            {/* Image Upload */}
                            <button 
                                onClick={() => { imageInputRef.current?.click(); setShowAttachments(false); }}
                                className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 hover:border-purple-500 transition-all group whitespace-nowrap"
                            >
                                <div className="p-1.5 bg-purple-500/20 rounded-lg group-hover:bg-purple-500 transition-colors">
                                    <PhotoIcon className="w-5 h-5 text-purple-500 dark:text-purple-400 group-hover:text-white" />
                                </div>
                                <span className="text-sm font-bold">تحليل صورة</span>
                            </button>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>

                    {/* Formatting Toolbar */}
                    <div className="hidden sm:flex items-center gap-1">
                        <button 
                            onClick={() => handleFormat('bold')} 
                            className="p-1.5 text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" 
                            title="نص عريض (Bold)"
                            disabled={isProcessing || isRecording}
                        >
                            <Bold className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleFormat('italic')} 
                            className="p-1.5 text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" 
                            title="نص مائل (Italic)"
                            disabled={isProcessing || isRecording}
                        >
                            <Italic className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleFormat('list')} 
                            className="p-1.5 text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" 
                            title="قائمة نقطية"
                            disabled={isProcessing || isRecording}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Right Side: Send/Mic */}
                <div className="flex items-center gap-2">
                    {!inputText.trim() ? (
                        <button 
                            onClick={toggleRecording}
                            className={`p-3 text-white rounded-full transition-all disabled:opacity-50 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`}
                            disabled={isProcessing}
                            title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
                        >
                            {isRecording ? <StopIcon className="w-5 h-5 text-white" /> : <MicrophoneIcon className="w-5 h-5" />}
                        </button>
                    ) : (
                        <button 
                            onClick={handleSendText}
                            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                            disabled={isProcessing}
                            title="إرسال"
                        >
                            <PaperAirplaneIcon className="w-5 h-5 -rotate-90 md:rotate-180" />
                        </button>
                    )}
                </div>
            </div>

            {/* Hidden Inputs */}
            <input
                type="file"
                ref={fileInputRef}
                accept=".lrec,.mp3,.wav,.m4a,.pdf,.docx,.doc,.ogg,.flac,.webm,.aac,.opus,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,audio/*"
                className="hidden"
                onChange={handleLectureUpload}
            />
            <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />
        </div>
        
        {/* Footer Disclaimer */}
        <p className="text-center text-zinc-500 dark:text-zinc-600 text-xs font-cairo">
            قد يرتكب الذكاء الاصطناعي أخطاء. يرجى التحقق من المعلومات الهامة.
        </p>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
