import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  onComplete: () => void;
}

export const GlobalSplashScreen: React.FC<Props> = ({ onComplete }) => {
  const tutorInfo = useAppStore(state => state.tutorInfo);
  const text = tutorInfo.splashScreenText || "Tutorly Presents";
  const subtext = tutorInfo.splashScreenSubtext || "Your English journey starts here";
  
  const logoUrl = useAppStore(state => state.logoUrl);
  
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    // Hold for 3 seconds, then exit animation for 800ms
    const timer1 = setTimeout(() => {
      setPhase('exit');
    }, 3000);
    
    const timer2 = setTimeout(() => {
      onComplete();
    }, 3800);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-center overflow-hidden transition-all duration-800"
      style={{
        background: 'radial-gradient(circle at center, #1a0b2e 0%, #0a0514 100%)',
        opacity: phase === 'exit' ? 0 : 1,
        visibility: phase === 'exit' ? 'hidden' : 'visible'
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute rounded-full opacity-40 mix-blend-screen blur-[80px] animate-pulse"
          style={{ width: '400px', height: '400px', background: '#6d28d9', top: '20%', left: '20%', animation: 'shapeFloat 6s infinite ease-in-out alternate' }}
        ></div>
        <div 
          className="absolute rounded-full opacity-40 mix-blend-screen blur-[80px] animate-pulse"
          style={{ width: '350px', height: '350px', background: '#4f46e5', bottom: '20%', right: '20%', animation: 'shapeFloat 6s infinite ease-in-out alternate', animationDelay: '-3s' }}
        ></div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center text-center animate-slide-up">
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="w-[120px] h-[120px] object-contain rounded-2xl mb-6 shadow-[0_0_40px_rgba(139,92,246,0.4)]" />
        )}
        <h1 className="text-white text-5xl md:text-6xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-br from-white to-indigo-300 drop-shadow-lg">
          {text}
        </h1>
        <p className="text-indigo-200/80 text-xl md:text-2xl font-medium tracking-wide">
          {subtext}
        </p>
        
        <div className="mt-10 w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" 
               style={{ animation: 'loaderFill 2.5s ease-out forwards 0.2s' }}>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shapeFloat {
            0% { transform: scale(1) translate(0, 0); }
            100% { transform: scale(1.1) translate(20px, -20px); }
        }
        @keyframes loaderFill {
            0% { width: 0%; }
            100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};
