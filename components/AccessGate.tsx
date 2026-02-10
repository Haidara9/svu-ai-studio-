
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { ShieldCheckIcon, UserCircleIcon, ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface AccessGateProps {
    onVerify: (id: string) => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onVerify }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const validate = (value: string) => {
        // Regex: 
        // ^[A-Za-z]+       -> Starts with letters
        // (_[A-Za-z]+)*    -> Optional segments starting with _ followed by letters
        // _[0-9]{4,6}$     -> Ends with _ and 4 to 6 digits
        const regex = /^[A-Za-z]+(_[A-Za-z]+)*_[0-9]{4,6}$/;
        return regex.test(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        
        if (validate(trimmed)) {
            onVerify(trimmed);
        } else {
            setError('الصيغة غير صحيحة. يجب أن يكون الاسم بالأحرف اللاتينية وينتهي بـ 4-6 أرقام. مثال: Haidara_12345');
        }
    };

    return (
        <div className="w-full max-w-md bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500 font-cairo">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/10">
                    <ShieldCheckIcon className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">تسجيل الدخول الأكاديمي</h2>
                <p className="text-zinc-500 text-sm font-medium">نظام إدارة الجلسات التعليمية</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 text-right">Academic ID / المعرف الأكاديمي</label>
                    <div className="relative group">
                        <UserCircleIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder=""
                            className={`w-full bg-zinc-50 dark:bg-zinc-950 border-2 ${error ? 'border-red-500/50 focus:border-red-500 ring-red-500/20' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500 ring-blue-500/20'} rounded-2xl py-4 pr-12 pl-4 text-left text-zinc-900 dark:text-white outline-none focus:ring-4 transition-all font-mono text-base shadow-inner`}
                            dir="ltr"
                            autoComplete="off"
                            autoFocus
                        />
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 mt-3 text-red-500 text-xs font-bold animate-in slide-in-from-top-1 bg-red-500/5 p-2 rounded-lg border border-red-500/10" dir="rtl">
                            <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <button 
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] group"
                >
                    <span>دخول للجلسة</span>
                    <ArrowRightIcon className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center space-y-3">
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-xl">
                    "This academic ID is used for organizational and session management purposes only and is not verified against Syrian Virtual University databases."
                </p>
                <p className="text-[10px] text-zinc-400 leading-relaxed max-w-[90%] mx-auto">
                    يستخدم هذا المعرف لأغراض تنظيمية فقط ولا يتم التحقق منه عبر قواعد بيانات الجامعة.
                </p>
            </div>
        </div>
    );
};
