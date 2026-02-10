
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { Flashcard } from '../services/gemini';

interface FlashcardInterfaceProps {
    cards: Flashcard[];
    onReset: () => void;
}

export const FlashcardInterface: React.FC<FlashcardInterfaceProps> = ({ cards, onReset }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        setIsFlipped(false);
    }, [currentIndex]);

    const nextCard = () => {
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const prevCard = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const toggleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    if (cards.length === 0) return null;

    const currentCard = cards[currentIndex];

    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-2xl mx-auto p-4 animate-in fade-in zoom-in-95 duration-500 font-cairo" dir="rtl">
            {/* Progress */}
            <div className="w-full flex items-center justify-between mb-4 px-2">
                <span className="text-sm font-mono text-zinc-500">بطاقة {currentIndex + 1} من {cards.length}</span>
                <div className="flex gap-1 flex-row-reverse">
                    {cards.map((_, idx) => (
                        <div key={idx} className={`h-1 w-4 rounded-full transition-colors ${idx === currentIndex ? 'bg-blue-500' : 'bg-zinc-800'}`} />
                    ))}
                </div>
            </div>

            {/* Card Container - Perspective Wrapper */}
            <div 
                className="group relative w-full aspect-[16/10] perspective-1000 cursor-pointer"
                onClick={toggleFlip}
                style={{ perspective: '1000px' }}
            >
                {/* Flipping Inner Container */}
                <div 
                    className={`relative w-full h-full transition-all duration-500 transform-style-3d shadow-2xl rounded-2xl ${isFlipped ? 'rotate-y-180' : ''}`}
                    style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                    {/* Front Face (Term) */}
                    <div 
                        className="absolute inset-0 backface-hidden bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-dot-grid"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">المصطلح</span>
                        <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                            {currentCard.term}
                        </h3>
                        <span className="absolute bottom-6 text-zinc-500 text-xs animate-pulse">اضغط لعرض التعريف</span>
                    </div>

                    {/* Back Face (Definition) */}
                    <div 
                        className="absolute inset-0 backface-hidden bg-zinc-800 border border-blue-500/30 rounded-2xl flex flex-col items-center justify-center p-8 text-center rotate-y-180"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        <span className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4">التعريف</span>
                        <p className="text-xl md:text-2xl text-zinc-200 leading-relaxed font-light">
                            {currentCard.definition}
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-8">
                <button 
                    onClick={prevCard} 
                    disabled={currentIndex === 0}
                    className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronRightIcon className="w-6 h-6" />
                </button>
                
                <button 
                    onClick={onReset}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-medium"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    <span>إعادة</span>
                </button>

                <button 
                    onClick={nextCard} 
                    disabled={currentIndex === cards.length - 1}
                    className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};
