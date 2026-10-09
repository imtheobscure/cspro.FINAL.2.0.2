import React from 'react';

const GoogleTranslateWidget: React.FC = () => {
    return (
        <div className="fixed bottom-4 left-4 z-[9999]">
            <div id="google_translate_element" className="bg-white rounded shadow border border-gray-200"></div>
        </div>
    );
};

export default GoogleTranslateWidget;

