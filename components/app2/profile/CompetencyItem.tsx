import React, { useState, useEffect, useRef } from 'react';
import { Competency, CompetencyStatus } from '../../../types2';
import { ICONS } from '../../../constants2';
import ProgressBar from '../ProgressBar';

interface CompetencyItemProps {
    competency: Competency;
    onProgressChange?: (competencyId: string, change: number) => void;
    isEditing?: boolean;
    onUpdate?: (c: Competency) => void;
    onRemove?: (id: string) => void;
}

const inputClass = "w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue placeholder:text-brand-gray-medium";

const CompetencyItem: React.FC<CompetencyItemProps> = ({ competency, onProgressChange, isEditing, onUpdate, onRemove }) => {
    const [localComp, setLocalComp] = useState(competency);
    const [changeAnim, setChangeAnim] = useState<{ id: number; amount: number; type: 'up' | 'down' } | null>(null);
    const changeIdRef = useRef(0);

    useEffect(() => {
        setLocalComp(competency);
    }, [competency]);

    const handleProgress = (amount: number) => {
        if (!onProgressChange) return;
        const newProgress = competency.progress + amount;
        if (newProgress >= 0 && newProgress <= 100) {
            onProgressChange(competency.id, amount);
            
            changeIdRef.current += 1;
            const currentChangeId = changeIdRef.current;
            setChangeAnim({
                id: currentChangeId,
                amount: Math.abs(amount),
                type: amount > 0 ? 'up' : 'down'
            });
            setTimeout(() => {
                setChangeAnim(prev => prev?.id === currentChangeId ? null : prev);
            }, 2000);
        }
    };

    const handleChange = (field: keyof Competency, value: any) => {
        setLocalComp(prev => ({...prev, [field]: value}));
    };

    const handleSave = () => {
        if(onUpdate) onUpdate(localComp);
    }
    
    if (isEditing) {
        return (
            <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center p-2 rounded-lg bg-gray-50">
                <input 
                    type="text" 
                    value={localComp.name} 
                    onChange={e => handleChange('name', e.target.value)} 
                    onBlur={handleSave}
                    className={inputClass} 
                />
                <input 
                    type="number" 
                    min="0" max="100" 
                    value={localComp.progress} 
                    onChange={e => handleChange('progress', parseInt(e.target.value))} 
                    onBlur={handleSave}
                    className={`${inputClass} w-24 text-center`} 
                />
                <button onClick={() => onRemove && onRemove(localComp.id)} className="text-red-500 hover:text-red-700 p-2 text-xl font-bold justify-self-center">&times;</button>
            </div>
        )
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 font-bold text-brand-gray-darkest">{ICONS[competency.icon as keyof typeof ICONS] || ICONS.target} <span>{competency.name}</span></div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${competency.status === CompetencyStatus.OnTrack ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{competency.status}</span>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => handleProgress(-10)} className="font-bold text-lg bg-brand-red text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">-</button>
                <ProgressBar progress={competency.progress} color={competency.status === CompetencyStatus.OnTrack ? 'bg-brand-green' : 'bg-brand-red'} previousProgress={Math.max(0, competency.progress - 15)} />
                <button onClick={() => handleProgress(10)} className="font-bold text-lg bg-brand-green text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-green-600 transition-colors">+</button>
                <div className="relative flex items-center justify-end w-10">
                    <span className="font-bold text-sm">{competency.progress}%</span>
                    {changeAnim && (
                        <span 
                            key={changeAnim.id} 
                            className={`absolute -top-4 right-0 font-bold text-sm animate-bounce ${changeAnim.type === 'up' ? 'text-green-500' : 'text-red-500'}`}
                        >
                            {changeAnim.type === 'up' ? '+' : '-'}{changeAnim.amount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompetencyItem;
