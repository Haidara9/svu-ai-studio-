
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    ArrowPathIcon, 
    BookOpenIcon,
    ChevronLeftIcon,
    PaperAirplaneIcon,
    QuestionMarkCircleIcon
} from '@heroicons/react/24/solid';
import { QuizQuestion, GeminiService } from '../services/gemini';
import { HistoryService } from '../services/history';

interface QuizInterfaceProps {
    questions: QuizQuestion[];
    onReset: () => void;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({ questions, onReset }) => {
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    
    // Essay State
    const [essayInput, setEssayInput] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [essayResult, setEssayResult] = useState<{ isCorrect: boolean, feedback: string } | null>(null);

    const nextButtonRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);

    // Current Question data
    const q = questions[currentQuestionIdx];
    
    const type = q?.type?.toLowerCase() || 'mcq';
    const isEssay = type === 'essay';
    const isTF = type === 'tf' || type === 'true_false';
    
    const options = (isTF && (!q.options || q.options.length === 0))
        ? ["صح", "خطأ"] 
        : (q?.options || []);

    useEffect(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentQuestionIdx]);

    useEffect(() => {
        if ((showFeedback || essayResult) && nextButtonRef.current) {
            setTimeout(() => {
                nextButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [showFeedback, essayResult]);

    const handleOptionSelect = (idx: number) => {
        if (selectedOption !== null || showFeedback) return; 
        
        setSelectedOption(idx);
        setShowFeedback(true);
        
        const selectedText = options[idx];
        const correctText = q.correctAnswerText || options[q.correctAnswerIndex || 0];

        if (selectedText.trim() === correctText.trim()) {
            setScore(prev => prev + 1);
        }
    };

    const handleEssaySubmit = async () => {
        if (!essayInput.trim() || isEvaluating || essayResult) return;
        
        setIsEvaluating(true);
        try {
            const evaluation = await GeminiService.evaluateEssayAnswer(q.question, q.explanation, essayInput);
            setEssayResult(evaluation);
            if (evaluation.isCorrect) {
                setScore(prev => prev + 1);
            }
        } catch (e) {
            console.error(e);
            alert("فشل تقييم الإجابة، يرجى المحاولة مرة أخرى.");
        } finally {
            setIsEvaluating(false);
        }
    };

    const goToNextQuestion = () => {
        if (currentQuestionIdx < questions.length - 1) {
            setSelectedOption(null);
            setShowFeedback(false);
            setEssayInput('');
            setEssayResult(null);
            setIsEvaluating(false);
            setCurrentQuestionIdx(prev => prev + 1);
        } else {
            setIsCompleted(true);
            const percentage = Math.round((score / questions.length) * 100);
            HistoryService.add({
                type: 'quiz',
                title: `اختبار مكتمل - النتيجة: ${percentage}%`
            });
        }
    };

    if (isCompleted) {
        const percentage = Math.round((score / questions.length) * 100);
        return (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-10 animate-in zoom-in-95 duration-500 max-w-lg mx-auto w-full">
                <div className={`w-40 h-40 md:w-48 md:h-48 rounded-full border-[10px] md:border-[12px] flex items-center justify-center bg-zinc-900 shadow-2xl ${percentage >= 60 ? 'border-emerald-500 shadow-emerald-500/20' : 'border-red-500 shadow-red-500/20'}`}>
                    <span className={`text-5xl md:text-6xl font-black ${percentage >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>{percentage}%</span>
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-white">{percentage >= 60 ? 'أحسنت زميلي!' : 'تحتاج لمراجعة أكثر'}</h2>
                    <p className="text-zinc-400 text-lg md:text-xl leading-relaxed">أجبت على {score} من أصل {questions.length} سؤالاً بشكل صحيح.</p>
                </div>
                <button onClick={onReset} className="w-full py-4 md:py-5 bg-white text-black font-black text-xl md:text-2xl rounded-2xl flex items-center justify-center gap-4 transition-transform active:scale-95 shadow-xl hover:bg-zinc-100">
                    <ArrowPathIcon className="w-6 h-6 md:w-8 md:h-8" /> إعادة الاختبار
                </button>
            </div>
        );
    }

    if (!q) return <div className="flex justify-center py-20"><p className="text-zinc-500 animate-pulse font-bold">جاري تحميل الأسئلة...</p></div>;

    const canMoveForward = showFeedback || essayResult;

    return (
        <div className="w-full max-w-4xl mx-auto py-4 md:py-8 px-4 flex flex-col font-cairo select-none" dir="rtl">
            <div ref={topRef} />
            
            {/* Progress Header */}
            <div className="bg-white/80 dark:bg-zinc-900/80 p-4 rounded-2xl md:rounded-3xl mb-6 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md sticky top-2 z-30 shadow-lg">
                <div className="flex justify-between items-center text-[10px] md:text-xs font-black text-zinc-500 mb-2 tracking-widest uppercase">
                    <span className="flex items-center gap-2">
                        <QuestionMarkCircleIcon className="w-4 h-4 text-blue-500" />
                        السؤال {currentQuestionIdx + 1} / {questions.length}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{Math.round(((currentQuestionIdx + 1) / questions.length) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-blue-600 to-blue-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.4)]" style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }} />
                </div>
            </div>

            {/* Question Card - Responsive & Aesthetic */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 p-6 sm:p-8 md:p-12 rounded-3xl md:rounded-[2.5rem] shadow-2xl mb-6 md:mb-10 relative overflow-hidden min-h-[160px] flex flex-col justify-center group transition-all duration-300 hover:border-zinc-600">
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-dot-grid opacity-10 pointer-events-none"></div>
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none transition-all group-hover:bg-blue-500/20"></div>
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none transition-all group-hover:bg-purple-500/20"></div>
                
                <div className="relative z-10 flex flex-col gap-4 md:gap-6">
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm border border-white/5 ${isEssay ? 'bg-indigo-500/20 text-indigo-300' : isTF ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                            {isEssay ? 'سؤال مقالي' : isTF ? 'صح أو خطأ' : 'اختيار من متعدد'}
                        </span>
                        {q.unitTitle && (
                            <span className="bg-zinc-800/80 backdrop-blur text-zinc-400 border border-zinc-700/50 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium truncate max-w-[200px] sm:max-w-xs shadow-sm">
                                {q.unitTitle}
                            </span>
                        )}
                    </div>

                    {/* Question Text */}
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-[1.8] sm:leading-relaxed md:leading-loose break-words font-cairo drop-shadow-sm">
                        {q.question}
                    </h3>
                </div>
            </div>

            {/* MCQ / TF Options */}
            {!isEssay && (
                <div className="grid gap-3 md:gap-4 mb-8 md:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {options.map((option, idx) => {
                        const isSelected = selectedOption === idx;
                        const correctText = q.correctAnswerText || options[q.correctAnswerIndex || 0];
                        const isCorrect = option.trim() === (correctText ? correctText.trim() : '');
                        
                        let colorStyle = "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-blue-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:scale-[1.01] shadow-sm";
                        if (showFeedback) {
                            if (isCorrect) colorStyle = "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-emerald-500/10";
                            else if (isSelected) colorStyle = "bg-red-500/10 dark:bg-red-500/20 border-red-500 text-red-700 dark:text-red-100 ring-2 ring-red-500/20 shadow-red-500/10";
                            else colorStyle = "bg-gray-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-600 opacity-60";
                        }

                        return (
                            <button 
                                key={idx} 
                                onClick={() => handleOptionSelect(idx)} 
                                disabled={showFeedback} 
                                className={`w-full p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 text-right transition-all duration-300 flex items-center justify-between group text-lg md:text-xl font-bold relative overflow-hidden ${colorStyle}`}
                            >
                                <span className="leading-snug break-words flex-1 relative z-10">{option}</span>
                                <div className="shrink-0 mr-4 relative z-10">
                                    {showFeedback && isCorrect && <CheckCircleIcon className="w-7 h-7 md:w-8 md:h-8 text-emerald-500 dark:text-emerald-400 animate-in zoom-in-50" />}
                                    {showFeedback && isSelected && !isCorrect && <XCircleIcon className="w-7 h-7 md:w-8 md:h-8 text-red-500 dark:text-red-400 animate-in zoom-in-50" />}
                                    {!showFeedback && <div className="w-6 h-6 md:w-7 md:h-7 rounded-full border-[3px] border-zinc-300 dark:border-zinc-700 group-hover:border-blue-500 transition-colors" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Essay Area */}
            {isEssay && (
                <div className="space-y-6 md:space-y-8 mb-10 animate-in fade-in duration-700">
                    <div className="relative">
                        <textarea
                            value={essayInput}
                            onChange={(e) => setEssayInput(e.target.value)}
                            disabled={isEvaluating || essayResult !== null}
                            placeholder="اكتب إجابتك هنا بتفصيل..."
                            className="w-full min-h-[180px] md:min-h-[220px] p-6 md:p-8 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl text-zinc-900 dark:text-white text-lg md:text-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none shadow-xl disabled:opacity-60 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        />
                        {!essayResult && (
                            <button 
                                onClick={handleEssaySubmit}
                                disabled={!essayInput.trim() || isEvaluating}
                                className="absolute bottom-4 left-4 md:bottom-6 md:left-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:bg-zinc-700 flex items-center gap-2 group z-20"
                                title="إرسال للتقييم"
                            >
                                {isEvaluating ? (
                                    <ArrowPathIcon className="w-6 h-6 md:w-7 md:h-7 animate-spin" />
                                ) : (
                                    <>
                                        <span className="text-xs font-bold md:hidden">تقييم</span>
                                        <PaperAirplaneIcon className="w-6 h-6 md:w-7 md:h-7 -rotate-90 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {essayResult && (
                        <div className="space-y-6 animate-in slide-in-from-top-4">
                            <div className={`p-6 md:p-8 rounded-[2.5rem] border-2 shadow-2xl flex items-start gap-4 md:gap-6 ${essayResult.isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30' : 'bg-red-50/50 dark:bg-red-950/20 border-red-500/30'}`}>
                                <div className="shrink-0 mt-1">
                                    {essayResult.isCorrect ? <CheckCircleIcon className="w-8 h-8 md:w-10 md:h-10 text-emerald-500" /> : <XCircleIcon className="w-8 h-8 md:w-10 md:h-10 text-red-500" />}
                                </div>
                                <div>
                                    <h4 className={`text-xl md:text-2xl font-black mb-2 ${essayResult.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {essayResult.isCorrect ? 'إجابة جيدة!' : 'ملاحظات حول الإجابة'}
                                    </h4>
                                    <p className="text-lg md:text-xl text-zinc-700 dark:text-zinc-200 font-medium leading-relaxed">{essayResult.feedback}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Feedback & Navigation Footer */}
            <div ref={nextButtonRef} className="pb-20">
                {canMoveForward && (
                    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-6 duration-700">
                        <div className="bg-blue-50 dark:bg-blue-600/5 border border-blue-200 dark:border-blue-500/20 p-6 md:p-8 rounded-3xl shadow-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <BookOpenIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-500 dark:text-blue-400" />
                                <span className="text-[10px] md:text-xs font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">التفسير الأكاديمي</span>
                            </div>
                            <p className="text-zinc-700 dark:text-zinc-300 text-lg md:text-xl leading-relaxed font-medium">{q.explanation}</p>
                        </div>
                        <button 
                            onClick={goToNextQuestion} 
                            className="w-full py-6 md:py-8 bg-blue-600 hover:bg-blue-500 text-white font-black text-2xl md:text-3xl rounded-3xl shadow-2xl flex items-center justify-center gap-4 md:gap-6 group transition-all hover:scale-[1.02] active:scale-95 hover:shadow-blue-500/30"
                        >
                            <span>{currentQuestionIdx < questions.length - 1 ? 'السؤال التالي' : 'عرض النتيجة النهائية'}</span>
                            <ChevronLeftIcon className="w-8 h-8 md:w-10 md:h-10 group-hover:-translate-x-3 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
