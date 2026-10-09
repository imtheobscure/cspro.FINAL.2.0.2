import React, { memo } from 'react';
import { Session } from '../../../types2';
import { format } from 'date-fns';

interface SessionItemProps {
    session: Session;
    sessionNumber: number;
    totalSessions: number;
    onShow: (session: Session, sessionNumber: number) => void;
    onEdit: (session: Session) => void;
    onRemove: (sessionId: string) => void;
    markers?: React.ReactNode;
}

const SessionItem: React.FC<SessionItemProps> = ({ session, sessionNumber, totalSessions, onShow, onEdit, onRemove, markers }) => {
    
    const handleRemove = () => {
        if (onRemove) {
            onRemove(session.id);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex items-center justify-between animate-fade-in">
            <div className="flex-1 min-w-0">
                <p className="font-extrabold text-lg text-brand-gray-darkest truncate">{session.lessonName || `Session ${sessionNumber}`}</p>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-gray-dark">{format(new Date(session.date), 'PPP')}</p>
                    {markers && <div className="flex items-center gap-1">{markers}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-brand-gray-darkest">
                    <span title="Duration" className="flex items-center gap-1"><i className="fas fa-clock"></i> {session.duration} min</span>
                    {(session.badges && session.badges.length > 0) && <span title="Badges Awarded" className="flex items-center gap-1"><i className="fas fa-medal text-yellow-500"></i> {session.badges.length}</span>}
                    {(session.skillsLearned && session.skillsLearned.length > 0) && <span title="Skills Learned" className="flex items-center gap-1"><i className="fas fa-check-circle text-green-500"></i> {session.skillsLearned.length}</span>}
                </div>
            </div>
            <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                <button onClick={() => onShow(session, sessionNumber)} className="bg-brand-blue text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                    Show
                </button>
                <button onClick={() => onEdit && onEdit(session)} className="bg-gray-200 text-gray-700 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                    Edit
                </button>
                <button onClick={handleRemove} className="bg-red-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-red-600 transition-colors text-sm">
                    Delete
                </button>
            </div>
        </div>
    );
};

export default memo(SessionItem);