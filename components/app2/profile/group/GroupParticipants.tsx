
import React, { useState, useMemo } from 'react';
import { GroupClass, Learner } from '../../../../types2';
import { useLearnerStore } from '../../../../store/useLearnerStore';
import { getAvatarUrl } from '../../../../services/avatarService';
import SectionCard from '../../SectionCard';
// Fix: Changed react-router-dom import to named import.
import { Link } from 'react-router-dom';

interface GroupParticipantsProps {
    group: GroupClass;
    allLearners: Learner[];
}

const GroupParticipants: React.FC<GroupParticipantsProps> = ({ group, allLearners }) => {
    const addParticipantToGroup = useLearnerStore(state => state.addParticipantToGroup);
    const removeParticipantFromGroup = useLearnerStore(state => state.removeParticipantFromGroup);
    
    const [selectedLearner, setSelectedLearner] = useState('');

    const participants = useMemo(() => {
        return allLearners.filter(l => group.participantIds.includes(l.id));
    }, [allLearners, group.participantIds]);

    const availableLearners = useMemo(() => {
        return allLearners.filter(l => !group.participantIds.includes(l.id));
    }, [allLearners, group.participantIds]);
    
    const handleAddParticipant = () => {
        if (selectedLearner) {
            addParticipantToGroup(group.id, selectedLearner);
            setSelectedLearner(''); // Explicitly reset selection after adding
        }
    };
    
    return (
        <SectionCard title="Participants" icon={<i className="fas fa-users"></i>}>
            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                {participants.map(p => (
                    <div key={p.id} className="group flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <Link to={`/learner/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                             <img src={getAvatarUrl(p.gender, p.avatarId, p.name)} alt={p.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                             <div className="min-w-0">
                                <p className="font-semibold truncate">{p.name}</p>
                                <p className="text-xs text-gray-500 truncate">{p.occupation || 'No occupation listed'}</p>
                             </div>
                        </Link>
                         <button 
                            onClick={() => removeParticipantFromGroup(group.id, p.id)} 
                            className="text-red-500 font-extrabold text-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove from group"
                        >
                           &times;
                        </button>
                    </div>
                ))}
            </div>
            <div className="border-t pt-4">
                <h4 className="font-bold text-sm mb-2">Add Participant</h4>
                 <div className="flex gap-2">
                    <select
                        value={selectedLearner}
                        onChange={e => setSelectedLearner(e.target.value)}
                        className="w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue"
                    >
                        <option value="" disabled>Select a learner...</option>
                        {availableLearners.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                    <button onClick={handleAddParticipant} className="bg-brand-blue text-white font-bold px-4 rounded-lg hover:bg-blue-600 transition-colors">
                        Add
                    </button>
                </div>
            </div>
        </SectionCard>
    );
};

export default GroupParticipants;