
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    ArrowPathIcon, 
    CheckIcon, 
    XMarkIcon, 
    EyeIcon, 
    AcademicCapIcon, 
    BookOpenIcon,
    ChevronLeftIcon,
    PaperAirplaneIcon
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
        <div className="w-full max-w-3xl mx-auto py-6 md:py-10 px-4 flex flex-col font-cairo select-none" dir="rtl">
            <div ref={topRef} />
            
            {/* Progress Header */}
            <div className="bg-zinc-900/60 p-4 md:p-6 rounded-3xl mb-6 md:mb-8 border border-zinc-800 backdrop-blur-md sticky top-0 z-20">
                <div className="flex justify-between items-center text-[10px] md:text-xs font-black text-zinc-500 mb-3 tracking-widest uppercase">
                    <span>السؤال {currentQuestionIdx + 1} من {questions.length}</span>
                    <span className="text-blue-500">{Math.round(((currentQuestionIdx + 1) / questions.length) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }} />
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 md:p-10 rounded-[2.5rem] shadow-2xl mb-8 md:mb-10 relative overflow-hidden min-h-[140px] flex flex-col justify-center">
                {/* Decorative background element */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/5 blur-[60px] rounded-full pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isEssay ? 'bg-indigo-500/20 text-indigo-400' : isTF ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {isEssay ? 'سؤال مقالي' : isTF ? 'صح أو خطأ' : 'اختيار من متعدد'}
                        </span>
                        {q.unitTitle && (
                            <span className="bg-zinc-800/50 text-zinc-500 px-3 py-1 rounded-full text-[10px] font-medium truncate max-w-[200px]">
                                {q.unitTitle}
                            </span>
                        )}
                    </div>
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-relaxed break-words">{q.question}</h3>
                </div>
            </div>

            {/* MCQ / TF Options */}
            {!isEssay && (
                <div className="grid gap-3 md:gap-4 mb-8 md:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {options.map((option, idx) => {
                        const isSelected = selectedOption === idx;
                        const correctText = q.correctAnswerText || options[q.correctAnswerIndex || 0];
                        const isCorrect = option.trim() === (correctText ? correctText.trim() : '');
                        
                        let colorStyle = "bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-blue-500/50 hover:bg-zinc-800/80 hover:scale-[1.01]";
                        if (showFeedback) {
                            if (isCorrect) colorStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-100 ring-4 ring-emerald-500/10";
                            else if (isSelected) colorStyle = "bg-red-500/20 border-red-500 text-red-100 ring-4 ring-red-500/10";
                            else colorStyle = "bg-zinc-950/40 border-zinc-900 text-zinc-600 opacity-40 grayscale-[0.5]";
                        }

                        return (
                            <button 
                                key={idx} 
                                onClick={() => handleOptionSelect(idx)} 
                                disabled={showFeedback} 
                                className={`w-full p-5 md:p-6 rounded-3xl border-2 text-right transition-all duration-300 flex items-center justify-between group text-lg md:text-xl font-bold ${colorStyle}`}
                            >
                                <span className="leading-snug break-words flex-1">{option}</span>
                                <div className="shrink-0 mr-4">
                                    {showFeedback && isCorrect && <CheckCircleIcon className="w-8 h-8 md:w-10 md:h-10 text-emerald-400 animate-in zoom-in-50" />}
                                    {showFeedback && isSelected && !isCorrect && <XCircleIcon className="w-8 h-8 md:w-10 md:h-10 text-red-400 animate-in zoom-in-50" />}
                                    {!showFeedback && <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border-4 border-zinc-700 group-hover:border-blue-500 transition-colors" />}
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
                            className="w-full min-h-[180px] md:min-h-[220px] p-6 md:p-8 bg-zinc-900 border-2 border-zinc-800 rounded-3xl text-white text-lg md:text-xl outline-none focus:border-indigo-500 transition-all resize-none shadow-xl disabled:opacity-60 placeholder:text-zinc-600"
                        />
                        {!essayResult && (
                            <button 
                                onClick={handleEssaySubmit}
                                disabled={!essayInput.trim() || isEvaluating}
                                className="absolute bottom-4 left-4 md:bottom-6 md:left-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:bg-zinc-800 flex items-center gap-2 group"
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
                            <div className={`p-6 md:p-8 rounded-[2.5rem] border-2 shadow-2xl flex items-start gap-4 md:gap-6 ${essayResult.isCorrect ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-red-950/20 border-red-500/50'}`}>
                                <div className="shrink-0 mt-1">
                                    {essayResult.isCorrect ? <CheckCircleIcon className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" /> : <XCircleIcon className="w-8 h-8 md:w-10 md:h-10 text-red-400" />}
                                </div>
                                <div>
                                    <h4 className={`text-xl md:text-2xl font-black mb-2 ${essayResult.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {essayResult.isCorrect ? 'إجابة جيدة!' : 'ملاحظات حول الإجابة'}
                                    </h4>
                                    <p className="text-lg md:text-xl text-white font-medium leading-relaxed">{essayResult.feedback}</p>
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
                        <div className="bg-blue-600/5 border border-blue-500/20 p-6 md:p-8 rounded-3xl shadow-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <BookOpenIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                                <span className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest">التفسير الأكاديمي</span>
                            </div>
                            <p className="text-zinc-300 text-lg md:text-xl leading-relaxed font-medium">{q.explanation}</p>
                        </div>
                        <button 
                            onClick={goToNextQuestion} 
                            className="w-full py-6 md:py-8 bg-blue-600 hover:bg-blue-500 text-white font-black text-2xl md:text-3xl rounded-3xl shadow-2xl flex items-center justify-center gap-4 md:gap-6 group transition-all hover:scale-[1.02] active:scale-95"
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
