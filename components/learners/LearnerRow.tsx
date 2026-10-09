
import React, { FC, useState, useEffect } from 'react';
import type { LearnerProfile, LearnerContent } from '../../types';

const LearnerRow: FC<{
    learner: LearnerProfile;
    // FIX: Made content prop optional as it can be undefined for new learners.
    content?: LearnerContent;
    onToggleComplete: () => void;
    onClick: () => void;
    onDelete: () => void;
}> = ({ learner, content, onToggleComplete, onClick, onDelete }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [timerColor, setTimerColor] = useState('text-gray-500');

    // Prioritize learner.lastGeneratedAt for the timer to ensure persistence across exports/imports
    const generatedAt = learner.lastGeneratedAt || content?.learningPackage?.generatedAt;

    useEffect(() => {
        if (!generatedAt) {
            setTimeLeft('No active assignment');
            setTimerColor('text-gray-500');
            return;
        }

        const deadline = new Date(generatedAt);
        deadline.setDate(deadline.getDate() + 5); // Homework deadline is 5 days

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = deadline.getTime() - now;

            if (distance < 0) {
                setTimeLeft('Deadline Passed');
                setTimerColor('text-red-800 bg-red-100');
                clearInterval(interval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            
            setTimeLeft(`${days}d ${hours}h ${minutes}m`);

            if (days > 2) setTimerColor('text-green-800 bg-green-100');
            else if (days > 0) setTimerColor('text-yellow-800 bg-yellow-100');
            else setTimerColor('text-red-800 bg-red-100');

        }, 1000);

        return () => clearInterval(interval);

    }, [generatedAt]);

    const isCompleted = content?.learningPackage?.completed;

    return (
        <div className={`flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 transition-colors ${isCompleted ? 'opacity-60' : ''}`}>
            <input 
                type="checkbox"
                checked={isCompleted || false}
                onChange={(e) => {
                    e.stopPropagation();
                    onToggleComplete();
                }}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-4"
                title={isCompleted ? "Mark as not completed" : "Mark as completed"}
            />
            <div className="flex-grow cursor-pointer" onClick={onClick}>
                <p className={`font-semibold text-lg text-blue-700 ${isCompleted ? 'line-through' : ''}`}>{learner.name}</p>
                <p className="text-sm text-gray-500">Level: {learner.cefrLevel}</p>
            </div>
            <div className="flex items-center space-x-4">
                <div className={`text-sm font-medium px-2 py-1 rounded-md ${timerColor}`}>
                    <i className="far fa-clock mr-1"></i> {timeLeft}
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete ${learner.name}? This action cannot be undone.`)) {
                            onDelete();
                        }
                    }} 
                    className="text-gray-400 hover:text-red-600 transition-colors p-2"
                    title="Delete Learner"
                >
                    <i className="fas fa-trash"></i>
                </button>
                <i className="fas fa-chevron-right text-gray-400" onClick={onClick}></i>
            </div>
        </div>
    );
};

export default LearnerRow;
