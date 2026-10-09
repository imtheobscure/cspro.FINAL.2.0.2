import React from 'react';
import Modal from './Modal';
import { CalendarEvent, Learner } from '../../types2';
import EventForm from './EventForm';

const EventModal = ({ isOpen, onClose, onSave, event, learners, groupId }: { isOpen: boolean, onClose: () => void, onSave: (event: any) => void, event: Partial<CalendarEvent> | null, learners: Learner[], groupId?: string }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={event?.id ? 'Edit Event' : 'Add New Event'}>
            <EventForm
                event={event}
                onSave={onSave}
                onClose={onClose}
                learners={learners}
                groupId={groupId}
            />
        </Modal>
    );
};

export default EventModal;
