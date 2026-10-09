import React, { useState, useEffect } from 'react';
import { useCalendarStore } from '../../../store/useCalendarStore';
import { useAppStore } from '../../../store/useAppStore';
import SectionCard from '../SectionCard';
import { SyncedCalendar } from '../../../types2';
import Modal from '../Modal';
import { formatDistanceToNow } from 'date-fns';

const inputClass = "w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue";
const colorOptions = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444'];

const CalendarForm: React.FC<{
    onSave: (calendar: Omit<SyncedCalendar, 'id'> | SyncedCalendar) => void;
    onClose: () => void;
    calendarToEdit: Partial<SyncedCalendar> | null;
}> = ({ onSave, onClose, calendarToEdit }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [color, setColor] = useState(colorOptions[0]);
    const [isEnabled, setIsEnabled] = useState(true);

    useEffect(() => {
        if (calendarToEdit) {
            setName(calendarToEdit.name || '');
            setUrl(calendarToEdit.url || '');
            setColor(calendarToEdit.color || colorOptions[0]);
            setIsEnabled(calendarToEdit.isEnabled !== false);
        } else {
            setName('');
            setUrl('');
            setColor(colorOptions[0]);
            setIsEnabled(true);
        }
    }, [calendarToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...calendarToEdit, name, url, color, isEnabled });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="font-bold block mb-1">Calendar Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="e.g., 'Work Calendar'" required />
            </div>
             <div>
                <label className="font-bold block mb-1">Calendar URL (.ics)</label>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} className={inputClass} placeholder="https://calendar.google.com/..." required />
                <p className="text-xs text-gray-500 mt-1">
                    To see actual event names instead of "busy", make sure to use your calendar's <strong className="font-semibold text-brand-blue">Secret address in iCal format</strong>.
                </p>
            </div>
            <div>
                <label className="font-bold block mb-1">Color</label>
                <div className="flex gap-2 mt-1">
                    {colorOptions.map(c => (
                        <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-800' : 'border-transparent'}`} style={{ backgroundColor: c }}></button>
                    ))}
                </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} className="h-5 w-5 rounded text-brand-blue focus:ring-brand-blue" />
                <span className="font-semibold">Enabled</span>
            </label>
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-brand-blue text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-600">Save Calendar</button>
            </div>
        </form>
    );
};

const CalendarSyncManager: React.FC = () => {
    // FIX: Refactored multi-property selectors with `shallow` to individual selectors to resolve type inference issues.
    const syncedCalendars = useCalendarStore(state => state.syncedCalendars);
    const addSyncedCalendar = useCalendarStore(state => state.addSyncedCalendar);
    const updateSyncedCalendar = useCalendarStore(state => state.updateSyncedCalendar);
    const removeSyncedCalendar = useCalendarStore(state => state.removeSyncedCalendar);
    const syncAllCalendars = useCalendarStore(state => state.syncAllCalendars);
    const loading = useAppStore(state => state.loading);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [calendarToEdit, setCalendarToEdit] = useState<SyncedCalendar | null>(null);

    const handleAddNew = () => {
        setCalendarToEdit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (cal: SyncedCalendar) => {
        setCalendarToEdit(cal);
        setIsModalOpen(true);
    };

    const handleSave = (calendarData: Omit<SyncedCalendar, 'id'> | SyncedCalendar) => {
        if ('id' in calendarData) {
            updateSyncedCalendar(calendarData);
        } else {
            addSyncedCalendar(calendarData);
        }
        setIsModalOpen(false);
    };

    const handleRemove = (id: string) => {
        if (window.confirm('Are you sure you want to remove this calendar? All its events will be removed.')) {
            removeSyncedCalendar(id);
        }
    };

    return (
        <>
            <SectionCard title="Calendar Sync" icon={<i className="fas fa-sync-alt text-xl"></i>}>
                <div className="space-y-3 mb-4">
                    {syncedCalendars.map((cal, index) => (
                        <div key={`${cal.id}-${index}`} className="group flex items-center gap-3 p-2 rounded-lg" style={{ borderLeft: `5px solid ${cal.color}`}}>
                            <div className="flex-1">
                                <p className="font-bold">{cal.name}</p>
                                <p className="text-xs text-gray-500">
                                    {cal.lastSynced 
                                        ? `Synced ${formatDistanceToNow(new Date(cal.lastSynced), { addSuffix: true })}` 
                                        : 'Never synced'}
                                </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(cal)} className="p-2 text-gray-500 hover:text-brand-blue rounded-full hover:bg-blue-100" title="Edit"><i className="fas fa-pencil-alt text-xs"></i></button>
                                <button onClick={() => handleRemove(cal.id)} className="p-2 text-gray-500 hover:text-brand-red rounded-full hover:bg-red-100" title="Remove"><i className="fas fa-trash-alt text-xs"></i></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                     <button onClick={handleAddNew} className="flex-1 bg-gray-100 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors shadow-sm text-sm">
                        + Add Calendar
                    </button>
                    <button onClick={syncAllCalendars} disabled={loading} className="flex-1 bg-brand-blue text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm text-sm disabled:bg-gray-400">
                        {loading ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>
            </SectionCard>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={calendarToEdit ? 'Edit Calendar' : 'Add New Calendar'}>
                <CalendarForm 
                    onSave={handleSave}
                    onClose={() => setIsModalOpen(false)}
                    calendarToEdit={calendarToEdit}
                />
            </Modal>
        </>
    );
};

export default CalendarSyncManager;