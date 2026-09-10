'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Circle } from 'lucide-react';

const BackgroundHearts = () => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(10)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: '110vh', x: `${(i * 10) + Math.random() * 5}%`, scale: 0.5 }}
                    animate={{ opacity: [0, 0.2, 0], y: '-10vh', rotate: [0, 180], scale: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 15 + Math.random() * 10, repeat: Infinity, delay: i * 2, ease: 'linear' }}
                    className="absolute text-red-500/10"
                >
                    <Heart size={30} fill="currentColor" />
                </motion.div>
            ))}
        </div>
    );
};

const LoveModeStep = ({ onComplete }: { onComplete: () => void }) => {
    const [isOn, setIsOn] = useState(false);
    useEffect(() => {
        if (isOn) {
            const timer = setTimeout(() => onComplete(), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOn, onComplete]);
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} className="flex flex-col items-center justify-center relative z-10">
            <div className={`backdrop-blur-2xl p-12 rounded-[3rem] transition-all duration-1000 ease-in-out flex flex-col items-center space-y-10 border border-white/10 ${isOn ? 'bg-red-500/10 shadow-[0_0_80px_rgba(239,68,68,0.2)] border-red-500/20' : 'bg-white/5 shadow-2xl'}`}>
                <div className="relative">
                    <motion.div animate={isOn ? { scale: [1, 1.15, 1], filter: ['drop-shadow(0 0 0px rgba(239,68,68,0))', 'drop-shadow(0 0 20px rgba(239,68,68,0.6))', 'drop-shadow(0 0 0px rgba(239,68,68,0))'] } : {}} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
                        <Heart className={`w-24 h-24 transition-all duration-1000 ${isOn ? 'text-red-500 fill-red-500' : 'text-white/10'}`} />
                    </motion.div>
                </div>
                <div className="flex flex-col items-center space-y-6">
                    <span className={`text-2xl sm:text-3xl font-playfair text-center transition-colors duration-1000 ${isOn ? 'text-white' : 'text-white/40'}`}>A Little Birthday Surprise...</span>
                    <button onClick={() => setIsOn(!isOn)} className={`group relative w-32 h-16 rounded-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] p-1.5 focus:outline-none ${isOn ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-white/10'}`}>
                        <motion.div animate={{ x: isOn ? 64 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="w-13 h-13 bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.2)] flex items-center justify-center pointer-events-none">
                            <Heart size={24} className={`transition-colors duration-500 ${isOn ? 'text-red-500 fill-red-500' : 'text-gray-300'}`} />
                        </motion.div>
                        <AnimatePresence>
                            {!isOn && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">off</motion.span>}
                            {isOn && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">on</motion.span>}
                        </AnimatePresence>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const TicTacToeStep = ({ onComplete }: { onComplete: () => void }) => {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isUserTurn, setIsUserTurn] = useState(true);
    const [winner, setWinner] = useState<string | null>(null);
    const [message, setMessage] = useState("Let's play a little birthday game...");
    const checkWinner = useCallback((squares: (string | null)[]) => {
        const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, b, c] of lines) {
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
        }
        return squares.includes(null) ? null : 'draw';
    }, []);
    const makeAIMove = useCallback((currentBoard: (string | null)[]) => {
        const emptyIndices = currentBoard.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (emptyIndices.length === 0) return;
        const nonCenterIndices = emptyIndices.filter(i => i !== 4);
        const targetIndex = nonCenterIndices.length > 0 ? nonCenterIndices[Math.floor(Math.random() * nonCenterIndices.length)] : 4;
        const newBoard = [...currentBoard];
        newBoard[targetIndex] = 'O';
        setBoard(newBoard);
        const result = checkWinner(newBoard);
        if (result) setWinner(result);
        else setIsUserTurn(true);
    }, [checkWinner]);
    const handleSquareClick = (index: number) => {
        if (board[index] || winner || !isUserTurn) return;
        const newBoard = [...board];
        newBoard[index] = 'X';
        setBoard(newBoard);
        const result = checkWinner(newBoard);
        if (result) setWinner(result);
        else {
            setIsUserTurn(false);
            setTimeout(() => makeAIMove(newBoard), 600);
        }
    };
    useEffect(() => {
        if (winner === 'X') {
            setMessage('You won! ❤️');
            const timer = setTimeout(() => onComplete(), 3500);
            return () => clearTimeout(timer);
        }
        if (winner === 'O' || winner === 'draw') {
            setMessage(winner === 'draw' ? 'A tie! Try again ❤️' : 'Almost! One more time...');
            const timer = setTimeout(() => {
                setBoard(Array(9).fill(null));
                setWinner(null);
                setIsUserTurn(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [winner, onComplete]);
    return (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center justify-center space-y-10 relative z-10">
            <h2 className="text-4xl font-playfair text-white text-center drop-shadow-lg max-w-xs whitespace-pre-line leading-tight">{winner === 'X' ? 'You won! ❤️' : message}</h2>
            <div className="grid grid-cols-3 gap-3 p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl">
                {board.map((square, i) => (
                    <button key={i} onClick={() => handleSquareClick(i)} className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all duration-300 group">
                        <AnimatePresence mode="wait">
                            {square === 'X' ? (
                                <motion.div key={winner === 'X' ? 'heart' : 'x'} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={winner === 'X' ? { delay: i * 0.15, type: 'spring' } : {}}>
                                    {winner === 'X' ? <Heart className="w-12 h-12 text-red-500 fill-red-500 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" /> : <X className="w-12 h-12 text-white/80" />}
                                </motion.div>
                            ) : square === 'O' ? (
                                <motion.div key="o" initial={{ scale: 0 }} animate={{ scale: 1 }}><Circle className="w-12 h-12 text-pink-300 opacity-50" /></motion.div>
                            ) : null}
                        </AnimatePresence>
                    </button>
                ))}
            </div>
            <AnimatePresence>
                {winner === 'X' && <motion.h2 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-playfair text-white text-center drop-shadow-lg mt-4">My heart ❤️</motion.h2>}
            </AnimatePresence>
        </motion.div>
    );
};

const LoveMeterStep = ({ onComplete }: { onComplete: () => void }) => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 40);
        const timer = setTimeout(() => onComplete(), 5500);
        return () => { clearInterval(interval); clearTimeout(timer); };
    }, [onComplete]);
    const radius = 90;
    const circumference = Math.PI * radius;
    const dashOffset = circumference - (progress / 100) * circumference;
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center space-y-12 w-full max-w-lg px-6 relative z-10">
            <div className="relative w-full aspect-[2/1] flex flex-col items-center justify-end overflow-hidden">
                <svg viewBox="0 0 200 100" className="w-full h-full absolute top-0 overflow-visible">
                    <path d="M 10,100 A 90,90 0 0 1 190,100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeLinecap="round" />
                    <motion.path d="M 10,100 A 90,90 0 0 1 190,100" fill="none" stroke="url(#loveGradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} animate={{ strokeDashoffset: dashOffset }} transition={{ duration: 0.1, ease: 'linear' }} style={{ filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' }} />
                    <defs><linearGradient id="loveGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                </svg>
                <div className="z-10 flex flex-col items-center pb-4">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}><Heart className="w-16 h-16 text-red-500 fill-red-500 mb-2" /></motion.div>
                    <div className="text-6xl font-black text-white font-mono tracking-tighter">{progress}<span className="text-red-400 text-3xl">%</span></div>
                    <span className="text-lg sm:text-xl text-white/60 font-playfair italic mt-2 tracking-widest text-center">Let's see how special today is... ❤️</span>
                </div>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5"><motion.div className="h-full bg-gradient-to-r from-red-500 to-pink-500" animate={{ width: `${progress}%` }} /></div>
        </motion.div>
    );
};

const TypewriterStep = ({ onComplete, name }: { onComplete: () => void; name: string }) => {
    const cleanName = (name || 'You').trim() || 'You';
    const text = `Happy Birthday, ${cleanName}`;
    const [displayedText, setDisplayedText] = useState('');
    useEffect(() => {
        if (displayedText.length >= text.length) {
            const timer = setTimeout(onComplete, 1800);
            return () => clearTimeout(timer);
        }
        const timer = setTimeout(() => {
            setDisplayedText(text.slice(0, displayedText.length + 1));
        }, 90);
        return () => clearTimeout(timer);
    }, [displayedText, text, onComplete]);
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(20px)' }} className="flex items-center justify-center p-8 relative z-10">
            <h1 className="text-5xl sm:text-8xl font-playfair text-white text-center leading-tight">
                {displayedText}
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-2 sm:w-4 h-12 sm:h-20 bg-red-500 ml-2 align-middle" />
            </h1>
        </motion.div>
    );
};

export default function InteractionFlow({ onFlowComplete, name = 'You' }: { onFlowComplete: () => void; name?: string }) {
    const [step, setStep] = useState(1);
    return (
        <div className="fixed inset-0 z-50 bg-[#060010] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15)_0%,transparent_70%)]" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <BackgroundHearts />
            <AnimatePresence mode="wait">
                {step === 1 && <LoveModeStep key="step1" onComplete={() => setStep(2)} />}
                {step === 2 && <TicTacToeStep key="step2" onComplete={() => setStep(3)} />}
                {step === 3 && <LoveMeterStep key="step3" onComplete={() => setStep(4)} />}
                {step === 4 && <TypewriterStep key="step4" name={name} onComplete={onFlowComplete} />}
            </AnimatePresence>
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-900/20 blur-[100px] rounded-full" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-900/20 blur-[100px] rounded-full" />
        </div>
    );
}
