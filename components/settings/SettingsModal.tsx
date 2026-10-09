
import React, { FC, useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { TutorProfile } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useLearnerStore } from '../../store/useLearnerStore';
import { useTodoStore } from '../../store/useTodoStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useBookingStore } from '../../store/useBookingStore';
import { useAutomationStore } from '../../store/useAutomationStore';
import * as idb from 'idb-keyval';
import {
    isFileSystemAccessSupported,
    getStoredDirectoryHandle,
    storeDirectoryHandle,
    clearStoredDirectoryHandle,
    verifyDirectoryPermission,
    isDiskModeEnabled,
    setDiskModeEnabled,
    writeJsonToDisk,
    readJsonFromDisk,
    saveAllToDisk,
    loadAllFromDisk,
    getLastSyncSummary,
    getLastRestoreSummary,
    readSafetySnapshot,
    restoreFromSafetyCopy,
    downloadFullBackupFile,
    importFullBackupFile
} from '../../utils/diskStorage';
import { resizeImage, dataURLtoBlob, uploadFileToServer } from '../../utils/imageUtils';
import { ensurePersistentStorage, getPersistenceStatus, type PersistenceStatus } from '../../utils/storageAdapter';
import { generateContentWithRetry } from '../../services/generation/core';
import ServerTime from '../app2/ServerTime';
import { AppCharacter } from '../../types';
import { DEFAULT_APP_CHARACTERS } from '../../utils/characters';

interface ApiSettings {
    provider: 'google' | 'openrouter' | 'openai' | 'deepseek' | 'gapgpt' | 'custom';
    apiKey: string;
    model: string;
    /** Required for Custom (OpenAI-compatible) providers — e.g. https://openrouter.ai/api/v1 */
    baseUrl?: string;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorProfile: TutorProfile;
    setTutorProfile: (profile: TutorProfile) => void;
}

const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose, tutorProfile, setTutorProfile }) => {
    const [activeTab, setActiveTab] = useState<'api' | 'tutor' | 'app' | 'email' | 'logs' | 'disk'>('api');
    const authTier = useAuthStore(state => state.tier);
    const openUpgradeModal = useAuthStore(state => state.openUpgradeModal);
    
    // Disk Storage state
    const [directoryHandle, setDirectoryHandle] = useState<any>(null);
    const [directoryName, setDirectoryName] = useState<string>('');
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [diskModeActive, setDiskModeActive] = useState<boolean>(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'exporting' | 'importing'>('idle');
    const [syncProgress, setSyncProgress] = useState<number>(0);
    const [syncLabel, setSyncLabel] = useState<string>('');
    const [fileBusy, setFileBusy] = useState<'idle' | 'export' | 'import'>('idle');
    // Whether the browser agreed to stop evicting this app's storage (asked for
    // automatically at startup — surfaced here so the tutor can see it is on).
    const [persistence, setPersistence] = useState<PersistenceStatus>(() => getPersistenceStatus());
    
    // Store
    const tutorInfo = useAppStore(state => state.tutorInfo);
    const setTutorInfo = useAppStore(state => state.setTutorInfo);
    
    const appNameStore = useAppStore(state => state.appName);
    const appAddressStore = useAppStore(state => state.appAddress);
    const logoUrlStore = useAppStore(state => state.logoUrl);
    
    const setAppNameStore = useAppStore(state => state.setAppName);
    const setAppAddressStore = useAppStore(state => state.setAppAddress);
    const setLogoUrlStore = useAppStore(state => state.setLogoUrl);
    
    const errors = useAppStore(state => state.errors);
    const clearErrors = useAppStore(state => state.clearErrors);
    const logError = useAppStore(state => state.logError);
    const [syncingErrors, setSyncingErrors] = useState(false);
    
    // App Settings State
    const [appName, setAppName] = useState(appNameStore);
    const [appAddress, setAppAddress] = useState(appAddressStore);
    const [logo, setLogo] = useState(logoUrlStore);
    const [baseTotal, setBaseTotal] = useState(tutorInfo.baseTotal || 675);
    const [splashScreenText, setSplashScreenText] = useState(tutorInfo.splashScreenText || 'Tutor Academy Presents');
    const [splashScreenSubtext, setSplashScreenSubtext] = useState(tutorInfo.splashScreenSubtext || '');
    const [enableSplashScreens, setEnableSplashScreens] = useState(tutorInfo.enableSplashScreens ?? true);
    const [subscribeEmail, setSubscribeEmail] = useState(tutorInfo.subscribeEmail || '');
    const [subscribeEnabled, setSubscribeEnabled] = useState(tutorInfo.subscribeEnabled ?? false);
    
    // Email Settings State
    const [sendGridApiKey, setSendGridApiKey] = useState(tutorInfo.sendGridApiKey || '');
    const [sendingEmail, setSendingEmail] = useState(tutorInfo.sendingEmail || '');
    const [emailTemplate, setEmailTemplate] = useState(tutorInfo.emailTemplate || 'Hi {{name}},\n\nHere is your report.\n\nBest,\n{{tutorName}}');

    // Tutor Profile Local States
    const [tutorName, setTutorName] = useState(tutorProfile.name || '');
    const [tutorInterests, setTutorInterests] = useState(tutorProfile.interests || '');
    const [tutorTeachingMethod, setTutorTeachingMethod] = useState(tutorProfile.teachingMethod || '');
    const [tutorBio, setTutorBio] = useState(tutorProfile.bio || '');
    const [tutorUsePersonalization, setTutorUsePersonalization] = useState(tutorProfile.useForPersonalization ?? true);

    useEffect(() => {
        if (isOpen) {
            setAppName(appNameStore || 'Tutor Academy');
            setAppAddress((appAddressStore === 'https://tutorly.ir' || !appAddressStore) ? 'https://tutomy.com' : appAddressStore);
            setLogo(logoUrlStore);
            setBaseTotal(tutorInfo.baseTotal || 675);
            setSplashScreenText(tutorInfo.splashScreenText || 'Tutor Academy Presents');
            setSplashScreenSubtext(tutorInfo.splashScreenSubtext || '');
            setEnableSplashScreens(tutorInfo.enableSplashScreens ?? true);
            setSubscribeEmail(tutorInfo.subscribeEmail || '');
            setSubscribeEnabled(tutorInfo.subscribeEnabled ?? false);
            setSendGridApiKey(tutorInfo.sendGridApiKey || '');
            setSendingEmail(tutorInfo.sendingEmail || '');
            setEmailTemplate(tutorInfo.emailTemplate || 'Hi {{name}},\n\nHere is your report.\n\nBest,\n{{tutorName}}');

            // Sync tutor local states
            setTutorName(tutorProfile.name || 'Tutor Alex');
            setTutorInterests(tutorProfile.interests || '');
            setTutorTeachingMethod(tutorProfile.teachingMethod || '');
            setTutorBio(tutorProfile.bio || '');
            setTutorUsePersonalization(tutorProfile.useForPersonalization ?? true);

            // Load local storage / disk options
            setDiskModeActive(isDiskModeEnabled());
            getStoredDirectoryHandle().then(async (handle) => {
                if (handle) {
                    setDirectoryHandle(handle);
                    setDirectoryName(handle.name);
                    const perm = await verifyDirectoryPermission(handle, false); // read check
                    setHasPermission(perm);
                }
            });
        }
    }, [isOpen, appNameStore, appAddressStore, logoUrlStore, tutorInfo, tutorProfile]);
    
    // API Settings State
    const [apiSettings, setApiSettings] = useState<ApiSettings>({
        provider: 'google',
        apiKey: '',
        model: 'gemini-2.0-flash'
    });
    
    const [isTestingApi, setIsTestingApi] = useState(false);
    const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
    const [charSaveMessage, setCharSaveMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const savedApi = localStorage.getItem('tutor-crafter-api-settings');
            if (savedApi) {
                setApiSettings(JSON.parse(savedApi));
            }
        }
    }, [isOpen]);

    const handleSaveApi = () => {
        localStorage.setItem('tutor-crafter-api-settings', JSON.stringify(apiSettings));
        setTestResult(null);
        alert('API Settings saved!');
        onClose();
    };

    const handleTestApi = async () => {
        setIsTestingApi(true);
        setTestResult(null);
        // Temporarily save to local storage for the test so core.ts picks it up
        localStorage.setItem('tutor-crafter-api-settings', JSON.stringify(apiSettings));
        try {
            const resp = await generateContentWithRetry({
                contents: "Say 'Hello, World!'",
            }, 1);
            
            // Accommodate both old SDK (.text() as function) and new SDK (.text as string)
            const textContent = typeof resp.text === 'function' ? resp.text() : resp.text || '';
            const message = typeof textContent === 'string' ? textContent.substring(0, 50) : 'Response OK';
            
            setTestResult({ success: true, message: `Success! Model responded: ${message}...` });
        } catch (error) {
            setTestResult({ success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` });
        } finally {
            setIsTestingApi(false);
        }
    };

    const handleResetApi = () => {
        localStorage.removeItem('tutor-crafter-api-settings');
        setApiSettings({
            provider: 'google',
            apiKey: '',
            model: 'gemini-2.0-flash'
        });
        alert('API Settings reset to default.');
    };

    const handleSaveTutor = () => {
        setTutorProfile({
            name: tutorName,
            interests: tutorInterests,
            teachingMethod: tutorTeachingMethod,
            bio: tutorBio,
            useForPersonalization: tutorUsePersonalization,
            baseTotal,
        });
        alert('Tutor Profile saved!');
        onClose();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    try {
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                            if (ev.target && typeof ev.target.result === 'string') {
                                const resizedDataUrl = await resizeImage(ev.target.result, 150, 150);
                                const resizedBlob = dataURLtoBlob(resizedDataUrl);
                                const tutorName = tutorInfo.name || 'DefaultTutor';
                                const remoteUrl = await uploadFileToServer(resizedBlob, 'app_logo.jpg', tutorName, 'Logo');
                                setLogo(remoteUrl);
                            }
                        };
                        reader.readAsDataURL(blob);
                    } catch (error) {
                        console.error("Failed to resize and upload image", error);
                    }
                }
            }
        }
    };
    
    const handleSaveAppEmail = () => {
        setAppNameStore(appName);
        
        const finalAppAddress = appAddress.trim();
        setAppAddressStore(finalAppAddress);

        setLogoUrlStore(logo);
        setTutorInfo({ ...tutorInfo, sendGridApiKey, sendingEmail, emailTemplate, baseTotal, splashScreenText, splashScreenSubtext, enableSplashScreens, subscribeEmail, subscribeEnabled });
        alert("App & Email settings saved!");
        onClose();
    };

    // Disk Handlers
    const handleSelectFolder = async () => {
        try {
            if (!isFileSystemAccessSupported()) {
                alert("Your browser does not support local directory access. Please use a modern browser like Google Chrome, Microsoft Edge, or Opera.");
                return;
            }
            const handle = await (window as any).showDirectoryPicker();
            await storeDirectoryHandle(handle);
            setDirectoryHandle(handle);
            setDirectoryName(handle.name);
            
            const hasPerm = await verifyDirectoryPermission(handle, true);
            setHasPermission(hasPerm);
            
            alert(`Successfully connected to folder: "${handle.name}". You can now back up and sync your data!`);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return; // User cancelled
            }
            console.error("Folder selection failed:", err);
            alert(`Failed to select folder: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const handleVerifyPermission = async () => {
        if (!directoryHandle) return;
        const hasPerm = await verifyDirectoryPermission(directoryHandle, true);
        setHasPermission(hasPerm);
        if (hasPerm) {
            alert("Folder permission granted!");
        } else {
            alert("Folder permission was not granted.");
        }
    };

    const handleDisconnectFolder = async () => {
        if (confirm("Are you sure you want to disconnect this local storage folder?")) {
            await clearStoredDirectoryHandle();
            setDirectoryHandle(null);
            setDirectoryName('');
            setHasPermission(false);
        }
    };

    const handleToggleDiskMode = async (checked: boolean) => {
        if (checked && !directoryHandle) {
            alert("Please select a local storage folder first before enabling Auto Disk Sync.");
            return;
        }
        setDiskModeActive(checked);
        setDiskModeEnabled(checked);
        if (checked && directoryHandle) {
            const permitted = hasPermission || await verifyDirectoryPermission(directoryHandle, true);
            setHasPermission(permitted);
            if (!permitted) {
                setDiskModeActive(false);
                setDiskModeEnabled(false);
                alert("Folder permission was not granted. Auto Disk Sync remains off.");
                return;
            }
            // Seed the folder before the first background subscription fires.
            setSyncStatus('exporting');
            setSyncProgress(0);
            const ok = await saveAllToDisk(directoryHandle, (done, total) => {
                setSyncProgress(Math.round((done / Math.max(1, total)) * 100));
            });
            setSyncStatus('idle');
            if (!ok) {
                setDiskModeActive(false);
                setDiskModeEnabled(false);
                alert("The initial backup could not be completed. Auto Disk Sync remains off.");
            }
        }
    };

    /**
     * “Export All to Folder” now runs through the shared backup engine in
     * utils/diskStorage — the same engine the automatic sync writes with and the
     * restore reads back. Keeping one single folder layout (adult_dashboard/,
     * kids_dashboard/, classroom_settings.json, …) is what makes an export
     * impossible to lose: there is no second, differently-shaped copy any more.
     */
    const handleInitialExport = async () => {
        setSyncStatus('exporting');
        setSyncProgress(0);
        setSyncLabel('Preparing export…');
        try {
            const handle = await getStoredDirectoryHandle();
            if (!handle) {
                alert("Connect a local folder first.");
                return;
            }
            const hasPerm = await verifyDirectoryPermission(handle, true);
            if (!hasPerm) {
                alert("Permission to write to the folder was denied. Please click 'Verify Folder Permission' first.");
                return;
            }

            const learnerCount = useLearnerStore.getState().learners.length;
            const ok = await saveAllToDisk(handle, (done, total, label) => {
                setSyncProgress(Math.round((done / Math.max(1, total)) * 100));
                if (label) setSyncLabel(label);
            }, { full: true });

            setSyncProgress(100);
            if (ok) {
                const summary = getLastSyncSummary();
                alert(`✅ Export complete.\n\n${learnerCount} adult learner${learnerCount === 1 ? '' : 's'} written into their own folders (profile.json + profile photos), together with the classroom layout, generated lessons, schedules, tasks, bookings, the young learners kingdom and every custom photo.\n\n${summary ? `${summary.written} file(s) written to “${directoryName || 'your folder'}”.` : ''}`);
            } else {
                alert("Export did not finish. Check the folder permission and available disk space, then try again.");
            }
        } catch (err) {
            console.error("Export failed:", err);
            alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSyncStatus('idle');
            setSyncLabel('');
        }
    };

    /**
     * Reads the folder back with the same engine, so everything the export wrote
     * (learners, lessons, calendar, tasks, bookings, kids kingdom, photos and the
     * classroom layout) comes back together instead of learners only.
     */
    const handleImportAllFromFolder = async () => {
        setSyncStatus('importing');
        setSyncProgress(0);
        setSyncLabel('Reading the folder…');
        try {
            const handle = await getStoredDirectoryHandle();
            if (!handle) {
                alert("Connect a local folder first.");
                return;
            }
            const hasPerm = await verifyDirectoryPermission(handle, false);
            if (!hasPerm) {
                alert("Permission to read from the folder was denied. Please click 'Verify Folder Permission' first.");
                return;
            }
            if (!confirm("Restore everything from this folder?\n\nLearners in this browser are replaced by the copies in the folder. Data that only exists in this browser (for example learners the folder does not contain) is kept — nothing is deleted from disk.")) {
                return;
            }

            const ok = await loadAllFromDisk(handle, { replaceLearners: true });
            setSyncProgress(100);
            if (ok) {
                const summary = getLastRestoreSummary();
                const note = summary?.incomplete
                    ? '\n\nNote: the folder’s backup was interrupted the last time it was written — the newest revision of a few files may be missing.'
                    : '';
                alert(`✅ Restore complete — ${summary?.learners ?? 0} learner(s) read back in. Reloading now so every dashboard shows the restored data.${note}`);
                window.location.reload();
            } else {
                alert("Nothing could be restored from this folder. Make sure it is a folder this app has backed up into (it should contain classroom_settings.json or an adult_dashboard folder). If the folder is gone, use 'Restore From Safety Copy'.");
            }
        } catch (err) {
            console.error("Import failed:", err);
            alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSyncStatus('idle');
            setSyncLabel('');
        }
    };

    const handleFlushBrowserMemory = async () => {
        // Never wipe the browser on a promise. This used to reset every store no
        // matter what — the single fastest way to lose a whole library. A verified
        // folder backup OR the never-purged local safety copy must exist first.
        const safety = await readSafetySnapshot();
        const safetyLearners = Array.isArray(safety?.learners) ? safety!.learners.length : 0;
        let folderVerified = false;
        try {
            const handle = await getStoredDirectoryHandle();
            if (handle && (await verifyDirectoryPermission(handle, true))) {
                const manifest = await readJsonFromDisk(handle, 'tutorly_backup_manifest.json');
                folderVerified = manifest?.complete === true;
            }
        } catch { /* treat as unverified */ }
        const learnersNow = useLearnerStore.getState().learners || [];
        if (!folderVerified && safetyLearners === 0 && learnersNow.length > 0) {
            alert("Nothing was flushed. Connect your backup folder and press 'Export All to Folder' first (or save to the cloud), so there is a verified copy to restore from. Your browser data was left untouched.");
            return;
        }

        const confirm1 = confirm("⚠️ WARNING: This will completely flush all local browser memory (this includes ALL current learners, session logs, calendar events, active todos, package bookings, and tags).\n\nA safety copy is kept so nothing is permanently lost, and you can restore it any time.\n\nAre you absolutely sure you want to proceed and empty the browser's storage?");
        if (!confirm1) return;
        
        const confirm2 = confirm("🔥 FINAL CONFIRMATION: Are you 100% sure? All local tutor data will be deleted from this browser tab, leaving it completely fresh and empty.");
        if (!confirm2) return;
        
        try {
            // Reset all 5 stores to default empty states
            useLearnerStore.setState({ learners: [], groupClasses: [] });
            useTodoStore.setState({ todos: [] });
            useCalendarStore.setState({ calendarEvents: [], syncedCalendars: [] });
            useBookingStore.setState({ learnerData: {} });
            useAutomationStore.setState({ 
                spacedRepetitionItems: [], 
                homeworkAssignments: [], 
                challenges: [], 
                streakFreezes: [], 
                notifications: [], 
                paymentRecords: [], 
                learnerTags: {} 
            });
            
            // Reset indexedDB content
            await idb.set('tutor-crafter-content', {});
            
            alert("🧹 Browser storage flushed successfully! Your local browser memory is now completely clean and empty. A safety copy was kept — click 'Restore All from Folder' (or 'Restore From Safety Copy') to bring your data back at any time.");
        } catch (err) {
            console.error("Flush memory failed:", err);
            alert(`Failed to flush browser memory: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const handleRestoreSafetyCopy = async () => {
        const ok = await restoreFromSafetyCopy({ replaceLearners: true });
        if (ok) {
            alert("✅ Restored from the local safety copy — reloading the app so every dashboard shows it.");
            window.location.reload();
        } else {
            alert("There is no local safety copy in this browser yet. It is written automatically after every successful backup to the folder or the cloud.");
        }
    };

    /** Back-up Suite: one portable file holding the entire workspace. */
    const handleExportBackupFile = async () => {
        setFileBusy('export');
        try {
            const res = await downloadFullBackupFile();
            if (res.ok) {
                alert(`✅ Back-up file saved (${((res.bytes || 0) / 1024 / 1024).toFixed(1)} MB, ${res.learners ?? 0} adult learner(s)).\n\nIt contains everything — learners and lessons, the classroom, the kids kingdom, custom photos and every widget's data.`);
            } else {
                alert(`Could not create the backup file: ${res.error || 'unknown error'}`);
            }
        } finally {
            setFileBusy('idle');
        }
    };

    const handleImportBackupFile = async (file: File) => {
        if (!confirm("Import this back-up file?\n\nLearners, lessons, the classroom, the young-learners kingdom, custom photos and widget data in the file are restored. Data that only exists in this browser is kept — nothing is deleted.\n\nContinue?")) return;
        setFileBusy('import');
        try {
            const res = await importFullBackupFile(file);
            if (res.ok) {
                alert(`✅ Import complete — ${res.learners ?? 0} adult learner(s) restored. Reloading so every dashboard shows the restored data.`);
                window.location.reload();
            } else {
                alert(`Import failed: ${res.error || 'the file could not be read.'}`);
            }
        } finally {
            setFileBusy('idle');
        }
    };

    const syncErrorsFromServer = async () => {
        setSyncingErrors(true);
        try {
            const res = await fetch('/error_log.php');
            if (res.ok) {
                const serverErrors = await res.json();
                if (Array.isArray(serverErrors)) {
                    clearErrors();
                    serverErrors.forEach((err: any) => {
                        if (err.message) logError(err.message, err.stack);
                    });
                }
            }
        } catch (e) {}
        setSyncingErrors(false);
    };

    useEffect(() => {
        if (isOpen && activeTab === 'logs') {
            syncErrorsFromServer();
        }
    }, [isOpen, activeTab]);

    useEffect(() => {
        if (isOpen && activeTab === 'disk') {
            void ensurePersistentStorage().then(setPersistence);
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-center items-center p-0 md:p-6 lg:p-8 overflow-y-auto" onClick={onClose}>
            <div className="bg-white w-full max-w-4xl min-h-screen md:min-h-0 md:max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
                
                {/* Header & Tabs */}
                <div className="bg-gray-50 border-b">
                    <div className="p-6 pb-0">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div className="flex space-x-6">
                            <button 
                                id="settings-api-tab"
                                onClick={() => setActiveTab('api')}
                                className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'api' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <i className="fas fa-code mr-2"></i> Global API Settings
                            </button>
                            <button 
                                id="settings-tutor-tab"
                                onClick={() => setActiveTab('tutor')}
                                className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'tutor' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <i className="fas fa-chalkboard-teacher mr-2"></i> Tutor Info
                            </button>
                            <button 
                                id="settings-app-tab"
                                onClick={() => {
                                    if (authTier !== 'vip') {
                                        openUpgradeModal('App Settings (branding, splash screen, subscribe button) is a VIP-exclusive feature.');
                                        return;
                                    }
                                    setActiveTab('app');
                                }}
                                className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'app' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                title={authTier === 'vip' ? 'App branding, splash screen, subscribe button' : '🔒 VIP-exclusive — upgrade to access App Settings'}
                            >
                                <i className="fas fa-laptop mr-2"></i> App Settings
                                {authTier !== 'vip' && <span className="ml-1 text-[9px] font-black text-amber-600">🔒 VIP</span>}
                            </button>
                            <button 
                                id="settings-email-tab"
                                onClick={() => setActiveTab('email')}
                                className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'email' ? 'border-emerald-600 text-emerald-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <i className="fas fa-envelope mr-2"></i> Email & Reminders
                            </button>
                            <button 
                                id="settings-logs-tab"
                                onClick={() => setActiveTab('logs')}
                                className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <i className="fas fa-exclamation-triangle mr-2"></i> Error Logs
                            </button>
                            <button 
                                id="settings-disk-tab"
                                onClick={() => setActiveTab('disk')}
                                className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'disk' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <i className="fas fa-hdd mr-2"></i> Back-up Suite
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1" onPaste={handlePaste}>
                    {activeTab === 'api' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                <p className="text-sm text-blue-800">
                                    <i className="fas fa-info-circle mr-2"></i>
                                    Configure which AI provider to use for generation.
                                </p>
                            </div>

                            <div>
                                <label className="font-semibold text-gray-700 block mb-1">AI Provider</label>
                                <select 
                                    value={apiSettings.provider} 
                                    onChange={e => setApiSettings({ ...apiSettings, provider: e.target.value as any })}
                                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
                                >
                                    <option value="google">Google Gemini (Default)</option>
                                    <option value="openrouter">OpenRouter (Free/Paid)</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="deepseek">Deepseek API</option>
                                    <option value="gapgpt">GapGPT (Iran)</option>
                                    <option value="custom">Custom — OpenAI-compatible (any provider)</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-gray-700 block mb-1">API Key</label>
                                <Input 
                                    type="password" 
                                    value={apiSettings.apiKey} 
                                    onChange={e => setApiSettings({ ...apiSettings, apiKey: e.target.value })} 
                                    placeholder={apiSettings.provider === 'google' ? "Leave empty to use default env key" : "sk-..."}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {apiSettings.provider === 'google' 
                                        ? "If left empty, the application's built-in key will be used." 
                                        : apiSettings.provider === 'custom' && !apiSettings.apiKey
                                            ? "Optional for local OpenAI-compatible servers (Ollama, LM Studio…) — required for hosted providers."
                                            : "Required for hosted providers (OpenRouter/OpenAI/Deepseek/GapGPT)."}
                                </p>
                            </div>

                            <div>
                                <label className="font-semibold text-gray-700 block mb-1">Model Name</label>
                                <Input 
                                    value={apiSettings.model} 
                                    onChange={e => setApiSettings({ ...apiSettings, model: e.target.value })} 
                                    placeholder="e.g., gemini-2.0-flash"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Examples: 
                                    {apiSettings.provider === 'google' && ' gemini-2.0-flash, gemini-3-pro-preview'}
                                    {apiSettings.provider === 'openrouter' && ' google/gemini-2.0-flash-001, deepseek/deepseek-r1, meta-llama/llama-3-70b-instruct'}
                                    {apiSettings.provider === 'openai' && ' gpt-4o, gpt-3.5-turbo'}
                                    {apiSettings.provider === 'deepseek' && ' deepseek-chat, deepseek-reasoner'}
                                    {apiSettings.provider === 'gapgpt' && ' e.g. the model id shown in your GapGPT dashboard'}
                                    {apiSettings.provider === 'custom' && ' any model id your endpoint accepts (e.g. gpt-4o, llama-3.1-70b, deepseek-chat)'}
                                </p>
                            </div>

                            {(apiSettings.provider === 'custom') && (
                                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-3">
                                    <div>
                                        <label className="font-semibold text-gray-700 block mb-1">
                                            <i className="fas fa-link mr-1.5 text-indigo-500"></i>Base URL <span className="text-red-500">*</span>
                                            <span className="text-[10px] text-gray-400 font-medium"> (OpenAI-compatible endpoint — works exactly like OpenCode / Cline / any custom provider)</span>
                                        </label>
                                        <Input
                                            value={apiSettings.baseUrl || ''}
                                            onChange={e => setApiSettings({ ...apiSettings, baseUrl: e.target.value })}
                                            placeholder="https://api.your-provider.com/v1  (or paste a full .../chat/completions URL)"
                                            className="font-mono"
                                        />
                                        <p className="text-[11px] text-gray-500 mt-1.5">
                                            The app appends <code className="bg-slate-100 px-1 rounded">/chat/completions</code> automatically when you give the base
                                            (e.g. <code className="bg-slate-100 px-1 rounded">https://openrouter.ai/api/v1</code>), and sends your requests with
                                            <code className="bg-slate-100 px-1 rounded"> Authorization: Bearer &lt;API key&gt;</code>.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">⚡ One-click presets</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {([
                                                { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.0-flash-001' },
                                                { name: 'Groq', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
                                                { name: 'Mistral', url: 'https://api.mistral.ai/v1', model: 'mistral-large-latest' },
                                                { name: 'Together AI', url: 'https://api.together.xyz/v1', model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
                                                { name: 'Perplexity', url: 'https://api.perplexity.ai', model: 'sonar' },
                                                { name: 'Ollama (local)', url: 'http://localhost:11434/v1', model: 'llama3.2' },
                                                { name: 'LM Studio (local)', url: 'http://localhost:1234/v1', model: 'local-model' }
                                            ] as { name: string; url: string; model: string }[]).map((p) => (
                                                <button key={p.name} type="button"
                                                    onClick={() => setApiSettings({ ...apiSettings, baseUrl: p.url, model: p.model })}
                                                    className="text-[10px] font-bold border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-full px-2.5 py-1 transition cursor-pointer">
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t flex justify-between items-center">
                                <Button onClick={handleResetApi} className="bg-red-100 text-red-700 hover:bg-red-200">Reset Defaults</Button>
                                <div className="flex gap-2">
                                    <Button onClick={handleTestApi} disabled={isTestingApi} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                                        {isTestingApi ? <><i className="fas fa-spinner fa-spin mr-2"></i> Testing...</> : 'Test API'}
                                    </Button>
                                    <Button onClick={handleSaveApi} className="bg-blue-600 hover:bg-blue-700">Save API Settings</Button>
                                </div>
                            </div>
                            {testResult && (
                                <div className={`p-3 rounded border text-sm mt-2 ${testResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                    {testResult.message}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'tutor' && (
                        <div className="space-y-6">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                                <p className="text-sm text-purple-800">
                                    <i className="fas fa-magic mr-2"></i>
                                    Your profile helps the AI personalize content with your teaching style and interests.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label>
                                <Input 
                                    value={tutorName} 
                                    onChange={e => setTutorName(e.target.value)} 
                                    placeholder="e.g. Teacher Sarah"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Your Interests / Hobbies</label>
                                <Textarea 
                                    value={tutorInterests} 
                                    onChange={e => setTutorInterests(e.target.value)} 
                                    placeholder="e.g. Travel, Cooking, Sci-Fi Movies..."
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Teaching Method / Style</label>
                                <Textarea 
                                    value={tutorTeachingMethod} 
                                    onChange={e => setTutorTeachingMethod(e.target.value)} 
                                    placeholder="e.g. Communicative, Grammar-focused, Fun and energetic..."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Bio / Background</label>
                                <Textarea 
                                    value={tutorBio} 
                                    onChange={e => setTutorBio(e.target.value)} 
                                    placeholder="Brief professional bio..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                <input 
                                    type="checkbox" 
                                    id="useForPersonalization"
                                    checked={tutorUsePersonalization}
                                    onChange={e => setTutorUsePersonalization(e.target.checked)}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="useForPersonalization" className="text-sm font-medium text-indigo-900 cursor-pointer">
                                    Use my profile to personalize AI lesson generation
                                </label>
                            </div>

                            <div className="pt-4 border-t flex justify-end">
                                <Button onClick={handleSaveTutor} className="bg-purple-600 hover:bg-purple-700">Save Tutor Profile</Button>
                            </div>
                            <div className="border-t pt-4 mt-4">
                                <h4 className="text-md font-bold text-gray-800 mb-3">Tutor Local Time</h4>
                                <ServerTime className="text-lg font-mono font-bold" />
                            </div>
                        </div>
                    )}
                    {activeTab === 'app' && authTier !== 'vip' && (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-pink-500 text-white flex items-center justify-center text-3xl shadow-xl animate-pulse">👑</div>
                            <h3 className="text-lg font-black text-gray-800">App Settings is a VIP-exclusive feature</h3>
                            <p className="text-sm text-gray-500 max-w-md">Branding, splash screens and the subscribe button are part of the VIP Elite suite (with direct support + library access).</p>
                            <button
                                onClick={() => openUpgradeModal('Unlock App Settings with a VIP plan (60 days · 1,000,000 Toman / 120 days · 1,500,000 Toman).')}
                                className="px-6 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-amber-500 via-purple-600 to-pink-600 hover:opacity-90 shadow-lg transition cursor-pointer"
                            >
                                👑 Upgrade to VIP
                            </button>
                        </div>
                    )}
                    {activeTab === 'app' && authTier === 'vip' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">App Name</label>
                                <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="e.g. Acme Tutoring" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">App Web Address</label>
                                <Input value={appAddress} onChange={e => setAppAddress(e.target.value)} placeholder="e.g. https://my-tutor-site.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Base Learner Count (for Dashboard "Total: +X")</label>
                                <Input type="number" value={baseTotal.toString()} onChange={e => setBaseTotal(parseInt(e.target.value) || 0)} placeholder="675" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tutor Logo</label>
                                <div className="flex gap-4 items-center">
                                    {logo && <img src={logo} alt="Logo preview" className="w-16 h-16 rounded-lg object-contain shadow border" />}
                                    <div className="flex-1">
                                        <Input value={logo} onChange={e => setLogo(e.target.value)} placeholder="Paste image URL or paste an image directly (Ctrl+V)" />
                                        <p className="text-xs text-gray-500 mt-1">You can copy an image and press Ctrl+V anywhere in this window to set it as your logo.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-4 mt-4">
                                <h4 className="text-md font-bold text-gray-800 mb-1">Splash Screen (lessons &amp; games)</h4>
                                <p className="text-xs text-gray-500 mb-3">
                                    Used by the splash screen at the start of exported lessons <span className="font-semibold">and</span> by
                                    every game in the Game Hub (Monopoly, Millionaire, …). Save once here and the
                                    games' start pages pick it up — including games that are already open.
                                </p>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Splash Screen Text</label>
                                    <Input value={splashScreenText} onChange={e => setSplashScreenText(e.target.value)} placeholder="e.g. Tutorly Presents" />
                                </div>
                                <div className="mt-3">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Splash Screen Subtext</label>
                                    <Input value={splashScreenSubtext} onChange={e => setSplashScreenSubtext(e.target.value)} placeholder="e.g. Welcome to your learning journey" />
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100 mt-3">
                                    <input
                                        type="checkbox"
                                        id="enableSplashScreens"
                                        checked={enableSplashScreens}
                                        onChange={e => setEnableSplashScreens(e.target.checked)}
                                        className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                                    />
                                    <label htmlFor="enableSplashScreens" className="text-sm font-medium text-teal-900 cursor-pointer">
                                        Enable splash screens in exported lessons and games
                                    </label>
                                </div>
                            </div>
                            <div className="border-t pt-4 mt-4">
                                <h4 className="text-md font-bold text-gray-800 mb-3">Subscribe Button in Lessons</h4>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email Address for Subscriptions</label>
                                    <Input value={subscribeEmail} onChange={e => setSubscribeEmail(e.target.value)} placeholder="e.g. tutor@example.com" />
                                    <p className="text-xs text-gray-500 mt-1">Leave blank to show a popup with the email address when users click Subscribe.</p>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100 mt-3">
                                    <input 
                                        type="checkbox" 
                                        id="subscribeEnabled"
                                        checked={subscribeEnabled}
                                        onChange={e => setSubscribeEnabled(e.target.checked)}
                                        className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                                    />
                                    <label htmlFor="subscribeEnabled" className="text-sm font-medium text-teal-900 cursor-pointer">
                                        Enable Subscribe button in exported lessons
                                    </label>
                                </div>
                            </div>
                            <div className="pt-4 border-t flex justify-end">
                                <Button onClick={handleSaveAppEmail} className="bg-teal-600 hover:bg-teal-700">Save App Settings</Button>
                             </div>
                        </div>
                    )}

                    {activeTab === 'email' && (
                        <div className="space-y-6">
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                <p className="text-sm text-emerald-800">
                                    <i className="fas fa-envelope-open-text mr-2"></i>
                                    Configure transactional email relays and automated student notification thresholds.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">SendGrid API Key</label>
                                    <Input 
                                        type="password" 
                                        value={sendGridApiKey} 
                                        onChange={e => setSendGridApiKey(e.target.value)} 
                                        placeholder="SG.xxxxxxxxxxxxxxxx" 
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Used to relay homework reminders and progress reports.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Sender Email Address</label>
                                    <Input 
                                        type="email" 
                                        value={sendingEmail} 
                                        onChange={e => setSendingEmail(e.target.value)} 
                                        placeholder="tutor@yourdomain.com" 
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Must be an authorized sender in your SendGrid dashboard.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Transactional Email Template</label>
                                <Textarea 
                                    value={emailTemplate} 
                                    onChange={e => setEmailTemplate(e.target.value)} 
                                    rows={5} 
                                    placeholder="Hi {{name}}, ..." 
                                />
                                <div className="text-[11px] text-gray-500 mt-1.5 flex flex-wrap gap-2 bg-gray-50 p-2 rounded border border-dashed">
                                    <span className="font-semibold text-gray-700">Available tags:</span>
                                    <span><code>{"{{name}}"}</code> - Student Name</span>
                                    <span><code>{"{{tutorName}}"}</code> - Your Name</span>
                                    <span><code>{"{{level}}"}</code> - CEFR Calibration</span>
                                    <span><code>{"{{reportUrl}}"}</code> - Live Progress Link</span>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-extrabold text-slate-800 text-base mb-3 flex items-center gap-2">
                                    <i className="fas fa-bell text-indigo-500"></i> Automated Tutor Reminders & Alert Settings
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 border rounded-lg">
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Streak Warning Threshold</label>
                                        <select 
                                            value={tutorInfo.streakWarningDays || '3'} 
                                            onChange={e => setTutorInfo({ ...tutorInfo, streakWarningDays: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-md bg-white text-black text-sm"
                                        >
                                            <option value="2">2 Days Remaining (Urgent)</option>
                                            <option value="3">3 Days Remaining (Standard)</option>
                                            <option value="5">5 Days Remaining (Proactive)</option>
                                        </select>
                                        <p className="text-[10px] text-gray-500 mt-1">Trigger red alerts on your sidebar when active streaks are close to expiration.</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 border rounded-lg">
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Monthly Backup Reminder</label>
                                        <select 
                                            value={tutorInfo.backupReminderInterval || 'weekly'} 
                                            onChange={e => setTutorInfo({ ...tutorInfo, backupReminderInterval: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-md bg-white text-black text-sm"
                                        >
                                            <option value="off">Off (Disable reminders)</option>
                                            <option value="weekly">Every Sunday morning</option>
                                            <option value="monthly">1st of every month</option>
                                        </select>
                                        <p className="text-[10px] text-gray-500 mt-1">Triggers inbox notifications reminding you to co-sync data to your local disk.</p>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-2.5">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="notifyOnStreakFreeze"
                                            checked={tutorInfo.notifyOnStreakFreeze ?? true}
                                            onChange={e => setTutorInfo({ ...tutorInfo, notifyOnStreakFreeze: e.target.checked })}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <label htmlFor="notifyOnStreakFreeze" className="text-sm font-medium text-slate-700 cursor-pointer">
                                            Notify me immediately when students request streak freezes
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="notifyOnQuizSubmit"
                                            checked={tutorInfo.notifyOnQuizSubmit ?? true}
                                            onChange={e => setTutorInfo({ ...tutorInfo, notifyOnQuizSubmit: e.target.checked })}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <label htmlFor="notifyOnQuizSubmit" className="text-sm font-medium text-slate-700 cursor-pointer">
                                            Flash warning badge when homework diagnostics are submitted
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="notifyOnIdle"
                                            checked={tutorInfo.notifyOnIdle ?? false}
                                            onChange={e => setTutorInfo({ ...tutorInfo, notifyOnIdle: e.target.checked })}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <label htmlFor="notifyOnIdle" className="text-sm font-medium text-slate-700 cursor-pointer">
                                            Alert me if any student remains inactive for more than 7 days
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t flex justify-end">
                                <Button onClick={handleSaveAppEmail} className="bg-emerald-600 hover:bg-emerald-700">Save Email & Reminder Settings</Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-exclamation-triangle text-red-500"></i> Error Logs
                                </h3>
                                <div className="space-x-2">
                                    <button 
                                        onClick={syncErrorsFromServer}
                                        disabled={syncingErrors}
                                        className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-bold transition-colors disabled:opacity-50"
                                    >
                                        <i className={`fas fa-sync mr-1 ${syncingErrors ? 'fa-spin' : ''}`}></i> Sync
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const dataStr = JSON.stringify(errors, null, 2);
                                            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                            const linkElement = document.createElement('a');
                                            linkElement.setAttribute('href', dataUri);
                                            linkElement.setAttribute('download', 'tutor-crafter-error-logs.json');
                                            linkElement.click();
                                        }}
                                        className="px-3 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded text-sm font-bold transition-colors"
                                    >
                                        <i className="fas fa-download mr-1"></i> Export
                                    </button>
                                    <label className="px-3 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded text-sm font-bold transition-colors cursor-pointer inline-block">
                                        <i className="fas fa-upload mr-1"></i> Import
                                        <input 
                                            type="file" 
                                            accept=".json" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (e) => {
                                                        try {
                                                            const importedErrors = JSON.parse(e.target?.result as string);
                                                            if (Array.isArray(importedErrors)) {
                                                                importedErrors.forEach(err => {
                                                                    if (err.message) {
                                                                        useAppStore.getState().logError(err.message, err.stack);
                                                                    }
                                                                });
                                                                alert("Successfully imported error logs.");
                                                            } else {
                                                                alert("Invalid log format.");
                                                            }
                                                        } catch (error) {
                                                            alert("Could not parse file.");
                                                        }
                                                    };
                                                    reader.readAsText(file);
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                            
                            {errors.length === 0 ? (
                                <div className="text-center p-8 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 italic">
                                    No errors logged. Things are running smoothly!
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    {errors.map((error, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded border border-red-200 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-red-600 text-sm break-words flex-1">{error.message}</p>
                                                <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{new Date(error.timestamp).toLocaleString()}</span>
                                            </div>
                                            {error.stack && (
                                                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto text-gray-700 border border-gray-200">
                                                    {error.stack}
                                                </pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {errors.length > 0 && (
                                <div className="flex justify-end pt-4 border-t border-gray-200">
                                    <button onClick={() => {
                                            if(window.confirm('Are you sure you want to clear all error logs?')) clearErrors();
                                        }} className="px-4 py-2 text-red-600 border border-red-200 rounded hover:bg-red-50 font-bold transition duration-300">
                                        <i className="fas fa-trash-alt mr-2"></i>Clear All Logs
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'disk' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 pb-2 border-b">
                                    <i className="fas fa-hdd text-indigo-600"></i> Back-up Suite
                                </h3>
                            </div>

                            {/*
                              * The automatic cache protection, made visible. This is a
                              * setting the app applies on its own at every start, so the
                              * point of showing it is that the tutor can confirm it is on
                              * instead of having to trust that it is.
                              */}
                            <div className={`p-4 rounded-xl border text-sm ${persistence.persisted ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                                <div className="flex items-start gap-3">
                                    <i className={`fas ${persistence.persisted ? 'fa-shield-halved text-emerald-600' : 'fa-triangle-exclamation text-amber-600'} text-lg mt-0.5`}></i>
                                    <div className="flex-1">
                                        <p className="font-bold">
                                            {persistence.persisted
                                                ? 'Protected — the browser will not clear your data by itself'
                                                : 'Automatic protection is on, but this browser would not grant it'}
                                        </p>
                                        <p className="mt-1">
                                            {persistence.persisted
                                                ? 'The app asks the browser to treat its storage as permanent, so the dashboard, learners and lessons are never evicted to free space for other sites. Nothing needs switching on — this is requested automatically every time the app starts.'
                                                : persistence.supported
                                                    ? 'This browser kept the app on “best effort” storage, which it is allowed to clear when the device runs low on space or after a long gap. Connect a folder below so a second copy always exists.'
                                                    : 'This browser has no storage-protection API, so a connected backup folder below is your safety net.'}
                                        </p>
                                        {persistence.usage !== null && persistence.quota !== null && (
                                            <p className="mt-1.5 text-xs opacity-80">
                                                Using {(persistence.usage / 1024 / 1024).toFixed(1)} MB of{' '}
                                                {(persistence.quota / 1024 / 1024).toFixed(0)} MB the browser allows this app.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {!isFileSystemAccessSupported() ? (
                                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                                    <i className="fas fa-exclamation-triangle mr-2"></i>
                                    Your browser doesn't fully support the native File System Access API. Please use a modern browser like Google Chrome, Microsoft Edge, or Opera on desktop to use local folder sync features.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Directory Connection State */}
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                                    <i className="fas fa-folder-open text-xl"></i>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800">Connected Folder</h4>
                                                    <p className="text-xs text-gray-500 font-mono">
                                                        {directoryHandle ? `Folder: ${directoryName}` : 'No local directory connected'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${directoryHandle ? (hasPermission ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') : 'bg-gray-200 text-gray-600'}`}>
                                                {directoryHandle ? (hasPermission ? '● Connected' : '● Needs Permission') : '○ Disconnected'}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {!directoryHandle ? (
                                                <button 
                                                    type="button" 
                                                    onClick={handleSelectFolder}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition cursor-pointer"
                                                >
                                                    <i className="fas fa-plug mr-1"></i> Connect Local Folder
                                                </button>
                                            ) : (
                                                <>
                                                    {!hasPermission && (
                                                        <button 
                                                            type="button" 
                                                            onClick={handleVerifyPermission}
                                                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold text-sm hover:bg-yellow-600 transition cursor-pointer"
                                                        >
                                                            <i className="fas fa-key mr-1"></i> Authorize Folder Access
                                                        </button>
                                                    )}
                                                    <button 
                                                        type="button" 
                                                        onClick={handleSelectFolder}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300 transition cursor-pointer"
                                                    >
                                                        <i className="fas fa-sync-alt mr-1"></i> Change Folder
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={handleDisconnectFolder}
                                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold text-sm hover:bg-red-200 transition cursor-pointer"
                                                    >
                                                        <i className="fas fa-unlink mr-1"></i> Disconnect
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Zero-Memory Mode Toggle */}
                                    <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                    <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                                                    Zero-Memory Mode (Auto Disk Sync)
                                                </h4>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    When enabled, opening a learner's profile automatically loads their lessons and sessions from your hard drive folder.
                                                    Leaving their profile automatically commits all changes back to your local folder and clears the browser's state/memory.
                                                    <strong> This prevents all "out of memory" or storage limit errors!</strong>
                                                </p>
                                            </div>
                                            <div className="flex items-center h-6">
                                                <input 
                                                    type="checkbox" 
                                                    id="toggleDiskMode" 
                                                    checked={diskModeActive} 
                                                    onChange={e => handleToggleDiskMode(e.target.checked)} 
                                                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-600 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Operations */}
                                    {directoryHandle && (
                                        <div className="p-4 border border-gray-200 rounded-xl space-y-4">
                                            <h4 className="font-bold text-gray-800 text-sm">Backup Actions</h4>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                                                    <h5 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Initial Export</h5>
                                                    <p className="text-xs text-gray-500">
                                                        Write everything in this browser to the connected folder: every learner folder and photo, generated lessons, the classroom layout, schedules, tasks, bookings and the kids kingdom.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={handleInitialExport}
                                                        disabled={syncStatus !== 'idle'}
                                                        className="w-full px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {syncStatus === 'exporting' ? `Exporting (${syncProgress}%)` : 'Export All to Folder'}
                                                    </button>
                                                </div>

                                                <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                                                    <h5 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Restore All</h5>
                                                    <p className="text-xs text-gray-500">
                                                        Read the folder back in: learners, lessons, the classroom layout, schedules, tasks, bookings, the kids kingdom and custom photos.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={handleImportAllFromFolder}
                                                        disabled={syncStatus !== 'idle'}
                                                        className="w-full px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {syncStatus === 'importing' ? 'Importing...' : 'Restore All from Folder'}
                                                    </button>
                                                </div>

                                                <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2 md:col-span-2">
                                                    <h5 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Back-up Suite — Full File</h5>
                                                    <p className="text-xs text-gray-500">
                                                        Save every learner, lesson, schedule, booking, the kids kingdom, custom photos and widget data into one portable JSON file — or import one back. Works without a folder, and understands older backup files too.
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleExportBackupFile}
                                                            disabled={syncStatus !== 'idle' || fileBusy !== 'idle'}
                                                            className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition disabled:opacity-50 cursor-pointer"
                                                        >
                                                            {fileBusy === 'export' ? <><i className="fas fa-spinner fa-spin mr-1"></i> Preparing…</> : <><i className="fas fa-download mr-1"></i> Export Everything to File</>}
                                                        </button>
                                                        <label className={`px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition cursor-pointer ${(syncStatus !== 'idle' || fileBusy !== 'idle') ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            {fileBusy === 'import' ? <><i className="fas fa-spinner fa-spin mr-1"></i> Importing…</> : <><i className="fas fa-upload mr-1"></i> Import From File</>}
                                                            <input
                                                                type="file"
                                                                accept=".json,application/json"
                                                                className="hidden"
                                                                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleImportBackupFile(f); }}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {syncStatus !== 'idle' && (
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-xs font-bold text-gray-600">
                                                        <span className="truncate pr-2">{syncLabel || (syncStatus === 'exporting' ? 'Exporting data...' : 'Reading local folder...')}</span>
                                                        <span>{syncProgress}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                                                            style={{ width: `${syncProgress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Flush Storage Section */}
                                    <div className="p-4 border border-red-200 bg-red-50/50 rounded-xl space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-red-100 text-red-600 rounded-lg shrink-0">
                                                <i className="fas fa-trash-alt text-lg"></i>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-red-800 text-sm">Browser Memory Purge</h4>
                                                <p className="text-xs text-red-700 leading-relaxed">
                                                    Completely erase all local profiles, logs, lessons, bookings, and tasks from this browser's memory.
                                                    Use this after backing up your data to ensure Zero-Memory Mode and folder synchronization are working flawlessly.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={handleRestoreSafetyCopy}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                                                title="Restore the last copy this browser kept on its own — works even if the backup folder is gone"
                                            >
                                                <i className="fas fa-life-ring"></i> Restore From Safety Copy
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleFlushBrowserMemory}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                                            >
                                                <i className="fas fa-radiation"></i> Flush Browser Memory
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
