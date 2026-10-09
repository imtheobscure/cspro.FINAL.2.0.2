
import React, { FC } from 'react';
import { Link } from 'react-router-dom';

const Header: FC<{ onExportAll: () => void; onExportLearners: () => void; onExportRecent: () => void; onImport: () => void }> = ({ onExportAll, onExportLearners, onExportRecent, onImport }) => {
    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center text-gray-800 hover:text-blue-600 transition-colors">
                    <i className="fas fa-graduation-cap text-blue-600 text-3xl mr-3"></i>
                    <h1 className="text-2xl font-bold">Tutor Academy Content Crafter</h1>
                </Link>
                <div className="flex items-center space-x-4">
                     <button onClick={onImport} title="Import Settings & Roster" className="text-gray-600 hover:text-blue-600 transition-colors text-xl">
                        <i className="fas fa-file-import"></i>
                    </button>
                    <button onClick={onExportLearners} title="Export Profiles, Groups & Settings (No Content)" className="text-gray-600 hover:text-purple-600 transition-colors text-xl">
                        <i className="fas fa-save"></i>
                    </button>
                    <button onClick={onExportRecent} title="Export Last 5 Users + Content" className="text-gray-600 hover:text-green-600 transition-colors text-xl">
                        <i className="fas fa-file-export"></i>
                    </button>
                    <Link to="/" className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-md transition-colors flex items-center">
                        <i className="fas fa-home mr-2"></i> Home
                    </Link>
                    <Link to="/library" className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-md transition-colors flex items-center">
                        <i className="fas fa-book mr-2"></i> Library
                    </Link>
                    <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 rounded-md transition-colors flex items-center shadow-sm">
                        <i className="fas fa-th-large mr-2"></i> Dashboard
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;
