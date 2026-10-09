
import React, { FC, useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ApiSettings {
    provider: 'google' | 'openrouter' | 'openai' | 'deepseek';
    apiKey: string;
    model: string;
}

interface ApiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ApiSettingsModal: FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState<ApiSettings>({
        provider: 'google',
        apiKey: '',
        model: 'gemini-2.0-flash'
    });

    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTestStatus('idle');
            setTestMessage('');
            const saved = localStorage.getItem('tutor-crafter-api-settings');
            if (saved) {
                setSettings(JSON.parse(saved));
            } else {
                // Default
                setSettings({
                    provider: 'google',
                    apiKey: '', // Don't show env key for security, just empty implies default
                    model: 'gemini-2.0-flash'
                });
            }
        }
    }, [isOpen]);

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('Testing connection...');
        try {
            const { provider, apiKey, model } = settings;
            
            if (provider === 'google') {
                const effectiveKey = apiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY;
                if (!effectiveKey) {
                    throw new Error("No API key provided and no default key found.");
                }
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Hello" }] }],
                        generationConfig: { maxOutputTokens: 10 }
                    })
                });
                
                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.error?.message || `HTTP Error ${res.status}`);
                }
            } else if (provider === 'openrouter') {
                if (!apiKey) throw new Error("API key is required for OpenRouter.");
                const res = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: "Hello" }],
                        max_tokens: 10
                    })
                });
                
                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.error?.message || `HTTP Error ${res.status}`);
                }
            } else if (provider === 'openai' || provider === 'deepseek') {
                if (!apiKey) throw new Error(`API key is required for ${provider === 'openai' ? 'OpenAI' : 'Deepseek'}.`);
                
                const endpoint = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/chat/completions';
                
                 const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: "Hello" }],
                        max_tokens: 10
                    })
                });
                
                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.error?.message || `HTTP Error ${res.status}`);
                }
            }
            
            setTestStatus('success');
            setTestMessage('Connection successful!');
        } catch (e: any) {
            setTestStatus('error');
            setTestMessage(`Error: ${e.message}`);
        }
    };

    const handleSave = () => {
        localStorage.setItem('tutor-crafter-api-settings', JSON.stringify(settings));
        alert('Settings saved! Future generations will use these settings.');
        onClose();
    };

    const handleReset = () => {
        localStorage.removeItem('tutor-crafter-api-settings');
        setSettings({
            provider: 'google',
            apiKey: '',
            model: 'gemini-2.0-flash'
        });
        alert('Settings reset to default (Google Env Key).');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold">Global API Settings</h2>
                    <p className="text-sm text-gray-500">Configure which AI provider to use for generation.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">AI Provider</label>
                        <select 
                            value={settings.provider} 
                            onChange={e => setSettings({ ...settings, provider: e.target.value as any })}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
                        >
                            <option value="google">Google Gemini (Default)</option>
                            <option value="openrouter">OpenRouter (Free/Paid)</option>
                            <option value="openai">OpenAI</option>
                            <option value="deepseek">Deepseek API</option>
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">API Key</label>
                        <Input 
                            type="password" 
                            value={settings.apiKey} 
                            onChange={e => setSettings({ ...settings, apiKey: e.target.value })} 
                            placeholder={settings.provider === 'google' ? "Leave empty to use default env key" : "sk-..."}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {settings.provider === 'google' 
                                ? "If left empty, the application's built-in key will be used." 
                                : "Required for OpenRouter/OpenAI/Deepseek."}
                        </p>
                    </div>

                    <div>
                        <label className="font-semibold text-gray-700 block mb-1">Model Name</label>
                        <Input 
                            value={settings.model} 
                            onChange={e => setSettings({ ...settings, model: e.target.value })} 
                            placeholder="e.g., gemini-2.0-flash"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Examples: 
                            {settings.provider === 'google' && ' gemini-2.0-flash, gemini-3-pro-preview'}
                            {settings.provider === 'openrouter' && ' google/gemini-2.0-flash-001, deepseek/deepseek-r1, meta-llama/llama-3-70b-instruct'}
                            {settings.provider === 'openai' && ' gpt-4o, gpt-3.5-turbo'}
                            {settings.provider === 'deepseek' && ' deepseek-chat, deepseek-reasoner'}
                        </p>
                    </div>

                    <div className="pt-2">
                        <Button 
                            onClick={handleTestConnection} 
                            disabled={testStatus === 'testing'}
                            className="bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300 w-full"
                        >
                            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                        </Button>
                        {testMessage && (
                            <div className={`mt-2 p-2 rounded text-sm ${testStatus === 'success' ? 'bg-green-50 text-green-700' : testStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                                {testMessage}
                            </div>
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
                    <Button onClick={handleReset} className="bg-red-100 text-red-700 hover:bg-red-200">Reset to Default</Button>
                    <div className="flex gap-2">
                        <Button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800">Cancel</Button>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save Settings</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiSettingsModal;
