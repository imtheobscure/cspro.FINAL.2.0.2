import React from 'react';

interface SectionCardProps {
  title: string;
  icon?: React.ReactElement;
  children: React.ReactNode;
  className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      {title && (
        <div className="flex items-center gap-3 mb-4">
          {icon && <span className="text-brand-green">{React.cloneElement(icon as React.ReactElement<any>, { className: 'w-7 h-7' })}</span>}
          <h2 className="text-2xl font-extrabold text-brand-gray-darkest">{title}</h2>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export default SectionCard;
