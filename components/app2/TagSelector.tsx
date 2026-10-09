
import React, { useState, useEffect } from 'react';

interface TagSelectorProps {
    options: { label: string; emoji: string }[];
    value: string; // comma-separated string
    onChange: (newValue: string) => void;
    placeholder: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({ options, value, onChange, placeholder }) => {
    const [selectedValues, setSelectedValues] = useState<string[]>([]);
    const [customValue, setCustomValue] = useState('');

    useEffect(() => {
        setSelectedValues(value ? value.split(',').map(v => v.trim()).filter(Boolean) : []);
    }, [value]);

    const handleToggle = (label: string) => {
        const newValues = selectedValues.includes(label)
            ? selectedValues.filter(v => v !== label)
            : [...selectedValues, label];
        onChange(newValues.join(', '));
    };

    const handleAddCustom = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && customValue.trim()) {
            e.preventDefault();
            if (!selectedValues.includes(customValue.trim())) {
                const newValues = [...selectedValues, customValue.trim()];
                onChange(newValues.join(', '));
            }
            setCustomValue('');
        }
    };
    
    return (
        <div>
            <div className="flex flex-wrap gap-3">
                {options.map(opt => (
                    <button
                        type="button"
                        key={opt.label}
                        onClick={() => handleToggle(opt.label)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-xl font-semibold ${selectedValues.includes(opt.label) ? 'bg-blue-50 border-brand-blue text-brand-blue' : 'bg-gray-50 border-gray-200'}`}
                    >
                        {opt.emoji} {opt.label}
                    </button>
                ))}
            </div>
             <div className="mt-3">
                <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    onKeyDown={handleAddCustom}
                    placeholder={placeholder}
                    className="w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue"
                />
             </div>
             {selectedValues.length > 0 &&
                 <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <span className="font-bold">Selected:</span> {value}
                 </div>
             }
        </div>
    );
};

export default TagSelector;