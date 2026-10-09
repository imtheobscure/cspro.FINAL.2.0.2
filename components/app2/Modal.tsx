import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'default' | 'full';
  closeOnOutsideClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'default', closeOnOutsideClick = true }) => {
  if (!isOpen) return null;

  const sizeClass = size === 'full' ? 'max-w-7xl' : 'max-w-2xl';

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-center items-center p-4 transition-all"
      onClick={() => { if (closeOnOutsideClick) onClose(); }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClass} max-h-[90vh] flex flex-col printable-modal`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-6 border-b border-brand-gray-light no-print">
          <h2 className="text-2xl font-extrabold text-brand-gray-darkest">{title}</h2>
          <button
            onClick={onClose}
            className="text-brand-gray-dark hover:text-brand-red text-3xl font-bold"
            aria-label="Close modal"
          >
            &times;
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Modal;