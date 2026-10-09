import React, { FC, PropsWithChildren } from 'react';

export const Card: FC<PropsWithChildren<{ className?: string; onClick?: () => void }>> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white shadow-md rounded-lg p-6 ${className}`}>{children}</div>
);

export default Card;
