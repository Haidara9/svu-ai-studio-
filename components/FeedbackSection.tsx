
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { 
    InboxArrowDownIcon,
    PaperAirplaneIcon,
    TrashIcon,
    LockClosedIcon,
    LockOpenIcon,
    UserIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { FeedbackService, FeedbackMessage } from '../services/feedback';

export const FeedbackSection: React.FC = () => {
    const [messages, setMessages] = useState<FeedbackMessage[]>([]);
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (isAdmin) {
            setMessages(FeedbackService.getMessages());
        }
    }, [isAdmin]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        FeedbackService.addMessage({
            studentName: name.trim() || 'طالب مجهول',
            content: content
        });

        setContent('');
        setName('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleDelete = (id: string) => {
        FeedbackService.deleteMessage(id);
        setMessages(FeedbackService.getMessages());
    };

    return (
        <div className="w-full h-full p-6 md:p-10 font-cairo bg-zinc-950 overflow-y-auto" dir="rtl">
            <div className="max-w-4xl mx-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <InboxArrowDownIcon className="w-8 h-8 text-emerald-500" />
                            صندوق الملاحظات
                        </h2>
                        <p className="text-zinc-500 mt-2 text-sm">
                            مساحة حرة لمراسلة الإدارة وتقديم الاقتراحات أو الشكاوى.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsAdmin(!isAdmin)}
                        className={`p-2 rounded-xl border transition-all ${isAdmin ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:text-white'}`}
                        title={isAdmin ? "خروج من وضع الإدارة" : "دخول الإدارة"}
                    >
                        {isAdmin ? <LockOpenIcon className="w-6 h-6" /> : <LockClosedIcon className="w-6 h-6" />}
                    </button>
                </div>

                {/* Admin View */}
                {isAdmin ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                        <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-xl flex items-center justify-between">
                            <span className="text-red-400 font-bold text-sm">وضع المسؤول: عرض رسائل الطلاب</span>
                            <span className="text-zinc-500 text-xs font-mono">{messages.length} رسالة</span>
                        </div>

                        {messages.length === 0 ? (
                            <div className="text-center py-20 text-zinc-600">
                                <InboxArrowDownIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>لا توجد رسائل جديدة.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg relative group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                    <UserIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">{msg.studentName}</h4>
                                                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-0.5 font-mono">
                                                        <ClockIcon className="w-3 h-3" />
                                                        {new Date(msg.timestamp).toLocaleString('ar-SY')}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(msg.id)}
                                                className="text-zinc-600 hover:text-red-500 transition-colors p-2"
                                                title="حذف الرسالة"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap pl-8 border-r-2 border-zinc-700 mr-1 pr-4">
                                            {msg.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Student View */
                    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                        {showSuccess && (
                            <div className="absolute inset-0 z-20 bg-emerald-900/90 backdrop-blur flex items-center justify-center flex-col animate-in fade-in">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                                    <PaperAirplaneIcon className="w-8 h-8 text-white -rotate-90 mr-1" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">تم الإرسال بنجاح!</h3>
                                <p className="text-emerald-200">شكراً لملاحظاتك، سيتم مراجعتها من قبل الإدارة.</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-zinc-400 text-sm font-bold mb-2">الاسم (اختياري)</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="اسمك الكريم..."
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-zinc-400 text-sm font-bold mb-2">نص الرسالة / الملاحظة</label>
                                <textarea 
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="اكتب ما يدور في ذهنك هنا..."
                                    className="w-full h-48 bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none leading-relaxed"
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl rounded-2xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <PaperAirplaneIcon className="w-6 h-6 -rotate-90" />
                                <span>إرسال للإدارة</span>
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
