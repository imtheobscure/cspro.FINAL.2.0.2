import React, { FC } from 'react';

const Input: FC<{ value: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; className?: string; required?: boolean }> = ({ value, onChange, placeholder, type = 'text', className = '', required }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-black ${className}`}
    />
);

export default Input;
