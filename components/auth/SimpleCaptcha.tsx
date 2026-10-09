// ============================================================
// SIMPLE ZERO-API SECURE CAPTCHA
// Self-contained visual & interactive challenge to protect tutor registration.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';

interface SimpleCaptchaProps {
  onVerify: (isValid: boolean) => void;
}

export const SimpleCaptcha: React.FC<SimpleCaptchaProps> = ({ onVerify }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operator, setOperator] = useState<'+' | 'x'>('+');
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generateChallenge = () => {
    const n1 = Math.floor(Math.random() * 8) + 2;
    const n2 = Math.floor(Math.random() * 8) + 1;
    const op = Math.random() > 0.5 ? '+' : 'x';
    setNum1(n1);
    setNum2(n2);
    setOperator(op);
    setUserAnswer('');
    setIsVerified(false);
    setError(false);
    onVerify(false);

    // Draw on canvas for bot obstruction
    setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Background noise
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Grid lines
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          for (let i = 0; i < canvas.width; i += 15) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + Math.random() * 10, canvas.height);
            ctx.stroke();
          }

          // Text with slight distortion
          ctx.font = 'bold 20px monospace';
          ctx.fillStyle = '#1e293b';
          const text = `${n1} ${op} ${n2} = ?`;
          ctx.fillText(text, 22, 28);
        }
      }
    }, 50);
  };

  useEffect(() => {
    generateChallenge();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setUserAnswer(val);

    const expected = operator === '+' ? num1 + num2 : num1 * num2;
    if (parseInt(val, 10) === expected) {
      setIsVerified(true);
      setError(false);
      onVerify(true);
    } else {
      setIsVerified(false);
      onVerify(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <canvas
            ref={canvasRef}
            width={140}
            height={40}
            className="rounded-lg border border-slate-300 dark:border-slate-600 shadow-inner bg-slate-100"
          />
          <button
            type="button"
            onClick={generateChallenge}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs transition"
            title="Refresh Captcha"
          >
            🔄
          </button>
        </div>

        <div className="flex-1 min-w-[90px]">
          <input
            type="number"
            value={userAnswer}
            onChange={handleChange}
            placeholder="Answer"
            className={`w-full p-2 text-center font-bold text-base rounded-lg border focus:ring-2 focus:outline-none transition ${
              isVerified
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 focus:ring-emerald-400'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-indigo-500'
            }`}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 px-1 text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">Human Verification</span>
        {isVerified ? (
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            ✅ Verified
          </span>
        ) : (
          <span className="text-slate-400">Solve the math check</span>
        )}
      </div>
    </div>
  );
};

export default SimpleCaptcha;
