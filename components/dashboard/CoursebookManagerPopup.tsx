import React from 'react';
import CoursebookManagerModal from '../app2/CoursebookManagerModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const CoursebookManagerPopup: React.FC<Props> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <CoursebookManagerModal 
            isOpen={isOpen}
            onClose={onClose}
        />
    );
};

export default CoursebookManagerPopup;
