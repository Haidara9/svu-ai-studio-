
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
    PaperAirplaneIcon, 
    TrashIcon,
    SparklesIcon,
    ArrowUpTrayIcon,
    DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { NotesService, SupportMessage } from '../services/notes';
import { GeminiService, ChatMessage } from '../services/gemini';

interface NotesSectionProps {
    transcript?: string | null;
    onUploadRequest: () => void;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ transcript, onUploadRequest }) => {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const history = NotesService.getHistory();
        if (history.length === 0) {
            const welcomeMsg: SupportMessage = {
                role: 'model',
                text: transcript 
                    ? 'أهلاً بك زميلي في قسم الدعم المباشر! 🎓\nلقد اطلعت على المحاضرة المرفوعة، كيف يمكنني مساعدتك في فهمها أو حل أي مشكلة تقنية تواجهك؟'
                    : 'أهلاً بك زميلي! 🎓\nأنا هنا لمساعدتك. لم تقم برفع أي محاضرة بعد، هل تريد رفعه الآن لأقوم بتحليلها لك؟',
                timestamp: new Date().toISOString()
            };
            setMessages([welcomeMsg]);
            NotesService.addMessage(welcomeMsg);
        } else {
            setMessages(history);
        }
    }, [transcript]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userText = inputText;
        setInputText('');
        
        const userMsg: SupportMessage = {
            role: 'user',
            text: userText,
            timestamp: new Date().toISOString()
        };
        
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        NotesService.addMessage(userMsg);
        
        setIsTyping(true);

        try {
            const chatHistory: ChatMessage[] = newMessages.map(m => ({
                role: m.role,
                text: m.text,
                timestamp: new Date(m.timestamp)
            }));

            const responseText = await GeminiService.sendSupportMessage(chatHistory, userText, transcript);

            const aiMsg: SupportMessage = {
                role: 'model',
                text: responseText,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, aiMsg]);
            NotesService.addMessage(aiMsg);

        } catch (error) {
            const errorMsg: SupportMessage = {
                role: 'model',
                text: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col font-cairo bg-zinc-950" dir="rtl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <SparklesIcon className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">الدعم الذكي المباشر</h2>
                        <p className="text-zinc-400 text-xs">أنا أفهم سياق دراستك الحالية تلقائياً.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!transcript && (
                        <button onClick={onUploadRequest} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center gap-2 px-3">
                            <ArrowUpTrayIcon className="w-5 h-5" />
                            <span className="text-xs font-bold">رفع ملف</span>
                        </button>
                    )}
                    <button onClick={() => { NotesService.clearHistory(); setMessages([]); }} className="p-2 text-zinc-500 hover:text-red-400 rounded-xl transition-colors">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-dot-grid">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`flex max-w-[85%] flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                            <div className={`p-4 md:p-5 rounded-3xl text-sm md:text-base leading-relaxed ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-tr-none' : 'bg-indigo-600 text-white rounded-tl-none'}`}>
                                {msg.text}
                            </div>
                            <span className="text-[10px] text-zinc-600 mt-1">{new Date(msg.timestamp).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex justify-end w-full">
                        <div className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 px-4 py-3 rounded-3xl rounded-tl-none flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:p-6 bg-zinc-900 border-t border-zinc-800 shrink-0">
                <div className="relative max-w-4xl mx-auto">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="كيف يمكنني مساعدتك؟"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-6 py-4 pr-14 text-white outline-none resize-none h-16 transition-all"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!inputText.trim() || isTyping}
                        className="absolute top-1/2 -translate-y-1/2 left-2 p-3 bg-indigo-600 text-white rounded-xl shadow-lg disabled:opacity-50"
                    >
                        <PaperAirplaneIcon className="w-5 h-5 -rotate-90" />
                    </button>
                </div>
            </div>
        </div>
    );
};
