import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

interface SplashScreenProps {
    onComplete?: () => void;
    duration?: number;
    show?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, duration = 3000, show = true }) => {
    const splashText = useAppStore(state => state.tutorInfo.splashScreenText) || 'Tutorly Presents';
    const splashSubtext = useAppStore(state => state.tutorInfo.splashScreenSubtext) || '';
    const logoUrlStore = useAppStore(state => state.logoUrl);

    useEffect(() => {
        if (!show) return;
        const timer = setTimeout(() => {
            if (onComplete) onComplete();
        }, duration);
        return () => clearTimeout(timer);
    }, [show, duration, onComplete]);

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div 
                className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#1a0a1e] to-[#0d0d12] overflow-hidden"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
            >
                {/* Background animated elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div 
                        className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div 
                        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"
                        animate={{ 
                            scale: [1.2, 1, 1.2],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    />
                </div>

                {/* Main Content */}
                <motion.div
                    className="relative z-10 flex flex-col items-center justify-center p-8 text-center"
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    {logoUrlStore && (
                        <motion.img 
                            src={logoUrlStore} 
                            alt="Logo" 
                            className="w-32 h-32 md:w-40 md:h-40 object-contain rounded-2xl mb-8 shadow-[0_0_40px_rgba(124,58,237,0.3)]"
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        />
                    )}
                    
                    <motion.h1 
                        className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white tracking-tight mb-4 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        {splashText}
                    </motion.h1>
                    
                    {splashSubtext && (
                        <motion.p 
                            className="text-lg md:text-xl font-medium text-indigo-200/80 tracking-wide mt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                        >
                            {splashSubtext}
                        </motion.p>
                    )}

                    <motion.div 
                        className="mt-12 w-48 h-1 bg-white/10 rounded-full overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                    >
                        <motion.div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: (duration / 1000) - 1.2, ease: "easeInOut", delay: 1 }}
                        />
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
