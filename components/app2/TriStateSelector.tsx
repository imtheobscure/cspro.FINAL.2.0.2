
import React from 'react';

interface Factor {
    label: string;
    emoji: string;
    definition: string;
}

interface TriStateSelectorProps {
    factors: Factor[];
    values: { [key: string]: 'strength' | 'challenge' };
    onValueChange: (label: string, state: 'strength' | 'challenge' | 'neutral') => void;
}

const TriStateSelector: React.FC<TriStateSelectorProps> = ({ factors, values, onValueChange }) => {

    const handleClick = (label: string) => {
        const currentState = values[label];
        if (!currentState) { // neutral -> strength (green)
            onValueChange(label, 'strength');
        } else if (currentState === 'strength') { // strength -> challenge (red)
            onValueChange(label, 'challenge');
        } else { // challenge -> neutral
            onValueChange(label, 'neutral');
        }
    };

    const getButtonClass = (label: string) => {
        const state = values[label];
        if (state === 'strength') {
            return 'bg-green-100 border-green-500 text-green-800';
        }
        if (state === 'challenge') {
            return 'bg-red-100 border-red-500 text-red-800';
        }
        return 'bg-gray-50 border-gray-200 hover:border-gray-300';
    };

    return (
        <div>
            <div className="flex flex-wrap gap-3">
                {factors.map(factor => (
                    <button
                        type="button"
                        key={factor.label}
                        onClick={() => handleClick(factor.label)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-xl font-semibold ${getButtonClass(factor.label)}`}
                    >
                        {factor.emoji} {factor.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TriStateSelector;