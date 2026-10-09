import React, { FC, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { H5P_TYPES } from '../../utils/h5pTypes';

interface H5PGameLibraryProps {
    onSelect: (typeId: string, template?: any) => void;
    onMultiSelect?: (typeIds: string[]) => void;
}

const H5PGameLibrary: FC<H5PGameLibraryProps> = ({ onSelect, onMultiSelect }) => {
    const [filter, setFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const filteredTypes = H5P_TYPES.filter(t => 
        t.label.toLowerCase().includes(filter.toLowerCase()) || 
        t.description.toLowerCase().includes(filter.toLowerCase())
    );

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            return [...prev, id];
        });
    };

    const handleAddToPrompt = () => {
        if (onMultiSelect) {
            onMultiSelect(selectedIds);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">📚 H5P Game Library</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Search games..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="p-2 border rounded-lg w-64"
                    />
                    {selectedIds.length > 0 && onMultiSelect && (
                        <Button onClick={handleAddToPrompt} className="bg-purple-600 hover:bg-purple-700 text-white">
                            Add {selectedIds.length} to Prompt
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTypes.map(type => {
                    const isSelected = selectedIds.includes(type.id);
                    return (
                        <Card 
                            key={type.id} 
                            className={`hover:shadow-lg transition cursor-pointer border-2 group relative ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-transparent hover:border-blue-500'}`} 
                            onClick={() => toggleSelection(type.id)}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${isSelected ? 'bg-purple-600 text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                    {isSelected ? <i className="fas fa-check"></i> : type.label.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{type.label}</h4>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{type.description}</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
            
            {filteredTypes.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No games found matching "{filter}"
                </div>
            )}
        </div>
    );
};

export default H5PGameLibrary;
