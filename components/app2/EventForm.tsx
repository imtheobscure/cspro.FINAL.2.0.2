import React, { useState, useEffect } from 'react';
import { CalendarEvent, Learner } from '../../types2';
import { format } from 'date-fns';

const inputClass = "w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue text-brand-gray-darkest placeholder:text-brand-gray-medium";

interface EventFormProps {
    onSave: (event: any) => void;
    onClose: () => void;
    event: Partial<CalendarEvent> | null;
    learners: Learner[];
    groupId?: string;
}

const EventForm: React.FC<EventFormProps> = ({ onSave, onClose, event, learners, groupId }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [time, setTime] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const [emoji, setEmoji] = useState('');
    const [learnerId, setLearnerId] = useState<string | undefined>(undefined);
    const [learnerSearchText, setLearnerSearchText] = useState('');
    const [suggestions, setSuggestions] = useState<Learner[]>([]);

    useEffect(() => {
        if (event) {
            const startDate = event.date ? format(new Date(`${event.date}T00:00:00`), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];
            setTitle(event.title || '');
            setDate(startDate);
            setEndDate(event.endDate ? format(new Date(`${event.endDate}T00:00:00`), 'yyyy-MM-dd') : startDate);
            setTime(event.time || '');
            setColor(event.color || '#3b82f6');
            setEmoji(event.emoji || '');
            setLearnerId(event.learnerId);
            
            if (event.learnerId) {
                const learner = learners.find(l => l.id === event.learnerId);
                setLearnerSearchText(learner?.name || '');
            } else {
                setLearnerSearchText('');
            }
        }
        setSuggestions([]);
    }, [event, learners]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...event, title, date, endDate, color, learnerId: groupId ? undefined : learnerId, groupId, emoji, time });
    };

    const handleLearnerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setLearnerSearchText(query);
        if (query) {
            setSuggestions(
                learners.filter(l => l.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
            );
        } else {
            setSuggestions([]);
            setLearnerId(undefined);
        }
    };

    const selectSuggestion = (learner: Learner) => {
        setLearnerId(learner.id);
        setLearnerSearchText(learner.name);
        setSuggestions([]);
    };
    
    const colorOptions = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#10b981'];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="font-bold block mb-1">Event Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                    <label className="font-bold block mb-1">Start Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} required />
                </div>
                 <div className="sm:col-span-1">
                    <label className="font-bold block mb-1">End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} min={date} />
                </div>
                <div className="sm:col-span-1">
                    <label className="font-bold block mb-1">Time (Optional)</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
                </div>
            </div>
            {!groupId && (
                <div>
                    <label className="font-bold block mb-1">Link to Learner (Optional)</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={learnerSearchText}
                            onChange={handleLearnerSearchChange}
                            placeholder="Type to search for a learner..."
                            className={inputClass}
                            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                        />
                        {suggestions.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
                                {suggestions.map(l => (
                                    <li
                                        key={l.id}
                                        onMouseDown={() => selectSuggestion(l)}
                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                    >
                                        {l.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
             <div>
                <label className="font-bold block mb-1">Emoji (Optional)</label>
                <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} className={inputClass} placeholder="e.g., 🎉, ✈️, 🏆" maxLength={2} />
            </div>
            <div>
                <label className="font-bold block mb-1">Color</label>
                <div className="flex gap-2 mt-1">
                    {colorOptions.map(c => (
                        <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-800' : 'border-transparent'}`} style={{ backgroundColor: c }}></button>
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-brand-blue text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-600">Save Event</button>
            </div>
        </form>
    );
};

export default EventForm;
