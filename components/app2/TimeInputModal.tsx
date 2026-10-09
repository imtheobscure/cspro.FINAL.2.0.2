import React, { useState } from 'react';

interface TimeInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (hours: number, minutes: number) => void;
  title: string;
}

const TimeInputModal: React.FC<TimeInputModalProps> = ({ isOpen, onClose, onSubmit, title }) => {
  const [timeStr, setTimeStr] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hours = 0, minutes = 0;
    const match = timeStr.trim().match(/^(\d{1,2})[.:]?(\d{2})?\s*(AM|PM|am|pm)?$/);
    if (match) {
        hours = parseInt(match[1], 10);
        minutes = match[2] ? parseInt(match[2], 10) : 0;
        const period = match[3]?.toUpperCase();
        
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        onSubmit(hours, minutes);
        setTimeStr('');
        onClose();
    } else {
        alert("Invalid time format. Please use HH:MM.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            autoFocus
            placeholder="e.g. 14:30 or 2:30 PM"
            className="w-full border border-gray-300 rounded-lg p-3 mb-4 bg-gray-50 text-gray-900"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
          />
          <div className="flex justify-end gap-3 block">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600">Save Time</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimeInputModal;
