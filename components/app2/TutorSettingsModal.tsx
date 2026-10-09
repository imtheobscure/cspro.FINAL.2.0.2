import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useLearnerStore } from '../../store/useLearnerStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
    saveToCloud,
    loadFromCloud,
    getCloudBackupInfo,
    deleteCloudBackup,
    isVipTier,
    type CloudBackupInfo
} from '../../services/cloudBackup';
import Modal from './Modal';
import { resizeImage, dataURLtoBlob, uploadFileToServer } from '../../utils/imageUtils';
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
    getDiskRestoreStatus,
    restoreFromSafetyCopy,
    downloadFullBackupFile,
    importFullBackupFile,
    triggerAutoSync
} from '../../utils/diskStorage';

import ServerTime from './ServerTime';
import { SearchableVoiceSelect } from '../ui/SearchableVoiceSelect';
import { AppCharacter } from '../../types';
import { DEFAULT_APP_CHARACTERS } from '../../utils/characters';

const inputClass = "w-full p-2 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue";

const TutorSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const tutorInfo = useAppStore(state => state.tutorInfo);
    const setTutorInfo = useAppStore(state => state.setTutorInfo);
    const characters = useAppStore(state => state.characters || DEFAULT_APP_CHARACTERS);
    const setCharacters = useAppStore(state => state.setCharacters);
    const addCharacter = useAppStore(state => state.addCharacter);
    const updateCharacter = useAppStore(state => state.updateCharacter);
    const deleteCharacter = useAppStore(state => state.deleteCharacter);
    const speak = useAppStore(state => state.speak);
    
    const appNameStore = useAppStore(state => state.appName);
    const appAddressStore = useAppStore(state => state.appAddress);
    const logoUrlStore = useAppStore(state => state.logoUrl);
    
    const setAppName = useAppStore(state => state.setAppName);
    const setAppAddress = useAppStore(state => state.setAppAddress);
    const setLogoUrl = useAppStore(state => state.setLogoUrl);
    
    // State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [interests, setInterests] = useState('');
    const [teachingMethod, setTeachingMethod] = useState('');
    const [bio, setBio] = useState('');
    const [tutorFacts, setTutorFacts] = useState('');
    const [tutorVoice, setTutorVoice] = useState(tutorInfo.voice || 'Microsoft Ryan Online (Natural) - English (United Kingdom)');
    const [timezone, setTimezone] = useState('');
    const [baseTotal, setBaseTotal] = useState<number>(675);
    const [appName, setAppNameLocal] = useState('');
    const [appAddress, setAppAddressLocal] = useState('');
    const [logo, setLogo] = useState('');
    const [splashScreenText, setSplashScreenText] = useState('Tutorly Presents');
    const [splashScreenSubtext, setSplashScreenSubtext] = useState('');
    const [enableSplashScreens, setEnableSplashScreens] = useState(true);
    
    const [activeTab, setActiveTab] = useState<'profile' | 'app' | 'characters' | 'disk'>('profile');
    const [charSaveMsg, setCharSaveMsg] = useState<string | null>(null);
    
    // Disk Storage state
    const [directoryHandle, setDirectoryHandle] = useState<any>(null);
    const [directoryName, setDirectoryName] = useState<string>('');
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [diskModeActive, setDiskModeActive] = useState<boolean>(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'exporting' | 'importing'>('idle');
    const [syncProgress, setSyncProgress] = useState<number>(0);
    const [syncLabel, setSyncLabel] = useState<string>('');
    const [fileBusy, setFileBusy] = useState<'idle' | 'export' | 'import'>('idle');
    
    // Email Settings
    const [sendGridApiKey, setSendGridApiKey] = useState('');
    const [sendingEmail, setSendingEmail] = useState('');
    const [emailTemplate, setEmailTemplate] = useState('');
    const [subscribeEmail, setSubscribeEmail] = useState('');
    const [subscribeEnabled, setSubscribeEnabled] = useState(false);

    // Cloud backup destination (VIP). The choice is stored on tutorInfo so it
    // follows the tutor across the adult dashboard, the kids dashboard and every
    // widget that reads the shared app storage.
    const authTier = useAuthStore(state => state.tier);
    const isVip = isVipTier();
    const [backupTarget, setBackupTarget] = useState<'disk' | 'cloud'>('disk');
    const [cloudInfo, setCloudInfo] = useState<CloudBackupInfo | null>(null);
    const [cloudBusy, setCloudBusy] = useState<'idle' | 'saving' | 'loading' | 'deleting'>('idle');
    const [cloudMsg, setCloudMsg] = useState<string | null>(null);

    const refreshCloudInfo = React.useCallback(async () => {
        if (!isVipTier()) { setCloudInfo(null); return; }
        setCloudInfo(await getCloudBackupInfo());
    }, [authTier]);

    useEffect(() => {
        if (isOpen) {
            setName(tutorInfo.name || '');
            setEmail(tutorInfo.email || '');
            setInterests(tutorInfo.interests || '');
            setTeachingMethod(tutorInfo.teachingMethod || '');
            setBio(tutorInfo.bio || '');
            setTutorFacts(tutorInfo.tutorFacts || '');
            setTimezone(tutorInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
            setBaseTotal(tutorInfo.baseTotal ?? 675);
            setAppNameLocal(appNameStore);
            setAppAddressLocal(appAddressStore);
            setLogo(logoUrlStore);
            setSplashScreenText(tutorInfo.splashScreenText || 'Tutorly Presents');
            setSplashScreenSubtext(tutorInfo.splashScreenSubtext || '');
            setEnableSplashScreens(tutorInfo.enableSplashScreens ?? true);
            setSubscribeEmail(tutorInfo.subscribeEmail || '');
            setSubscribeEnabled(tutorInfo.subscribeEnabled ?? false);
            setSendGridApiKey(tutorInfo.sendGridApiKey || '');
            setSendingEmail(tutorInfo.sendingEmail || '');
            setTutorVoice(tutorInfo.voice || 'Microsoft Ryan Online (Natural) - English (United Kingdom)');
            setEmailTemplate(tutorInfo.emailTemplate || 'Hi {{name}},\n\nHere is your report.\n\nBest,\n{{tutorName}}');
            setActiveTab('profile');

            // Backup destination (Hard Disk or VIP Cloud)
            const target = (tutorInfo as any).backupTarget === 'cloud' ? 'cloud' : 'disk';
            setBackupTarget(target);
            setCloudMsg(null);
            if (isVipTier()) void refreshCloudInfo();

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
    }, [isOpen, tutorInfo, appNameStore, appAddressStore, logoUrlStore]);
    
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
                                const currentTutor = tutorInfo.name || 'DefaultTutor';
                                const remoteUrl = await uploadFileToServer(resizedBlob, 'app_logo.jpg', currentTutor, 'Logo');
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
    
    const initiatePaste = async () => {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const type = item.types.find(t => t.startsWith('image/'));
                if (type) {
                    const blob = await item.getType(type);
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        if (e.target && typeof e.target.result === 'string') {
                            const resizedDataUrl = await resizeImage(e.target.result, 150, 150);
                            const resizedBlob = dataURLtoBlob(resizedDataUrl);
                            const currentTutor = tutorInfo.name || 'DefaultTutor';
                            const remoteUrl = await uploadFileToServer(resizedBlob, 'app_logo.jpg', currentTutor, 'Logo');
                            setLogo(remoteUrl);
                        }
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
            }
            alert("No image found in clipboard. Please copy an image and try again.");
        } catch (error) {
            console.error("Failed to read clipboard:", error);
            alert("Could not access clipboard. You can also focus the window and press Ctrl+V / Cmd+V.");
        }
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

    const handleToggleDiskMode = (checked: boolean) => {
        if (checked && !directoryHandle) {
            alert("Please select a local storage folder first before enabling Auto Disk Sync.");
            return;
        }
        setDiskModeActive(checked);
        setDiskModeEnabled(checked);
    };

    /**
     * Export/import go through the shared backup engine (utils/diskStorage) so this
     * screen writes the exact same folder layout the automatic sync and the restore
     * read back. The old hand-rolled version wrote its own layout, which is how an
     * “export succeeded” folder could still restore as empty.
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
                alert(`✅ Export complete.\n\n${learnerCount} adult learner${learnerCount === 1 ? '' : 's'} written into their own folders (profile.json + photos), together with the classroom layout, generated lessons, schedules, tasks, bookings, the young learners kingdom and every custom photo.${summary ? `\n\n${summary.written} file(s) written.` : ''}`);
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
            if (!confirm("Restore everything from this folder?\n\nLearners in this browser are replaced by the copies in the folder. Anything that only exists in this browser is kept — nothing is deleted from disk.")) {
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
                alert("Nothing could be restored from this folder. Make sure it is a folder this app has backed up into (it should contain classroom_settings.json or an adult_dashboard folder). If the folder is gone or unreadable, use 'Restore From Safety Copy' instead — it keeps a copy in this browser.");
            }
        } catch (err) {
            console.error("Import failed:", err);
            alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSyncStatus('idle');
            setSyncLabel('');
        }
    };

    /** Switches where the tutor's data is saved. Cloud is VIP-only. */
    const handleChooseBackupTarget = async (target: 'disk' | 'cloud') => {
        if (target === 'cloud' && !isVipTier()) {
            alert('Cloud saving is a VIP feature.\n\nYour data keeps saving to your own hard disk folder — nothing is lost. Upgrade to VIP to back up to the cloud.');
            return;
        }
        setBackupTarget(target);
        setTutorInfo({ backupTarget: target } as any);
        setCloudMsg(target === 'cloud'
            ? 'Cloud selected. Use "Save to Cloud Now" (or the save card in the corner) to push your data.'
            : 'Hard disk selected. Your folder backup keeps working exactly as before.');
        if (target === 'cloud') void refreshCloudInfo();
    };

    const handleCloudSaveNow = async () => {
        setCloudBusy('saving');
        setCloudMsg('Uploading your workspace…');
        const res = await saveToCloud();
        setCloudBusy('idle');
        if (res.success) {
            setCloudMsg(`✅ Saved to the cloud — revision ${res.revision} (${((res.bytes || 0) / 1024).toFixed(1)} KB).`);
            void refreshCloudInfo();
        } else {
            setCloudMsg(`❌ ${res.error || 'Cloud save failed.'}`);
        }
    };

    const handleCloudRestore = async () => {
        if (!confirm('Download your cloud backup and replace the data in this browser?\n\nLearners, sessions/feedback, schedules, todos, bookings and settings are restored. Generated lesson files stay on your hard disk.')) return;
        setCloudBusy('loading');
        setCloudMsg('Downloading from the cloud…');
        const res = await loadFromCloud({ replace: true });
        setCloudBusy('idle');
        if (res.success) {
            setCloudMsg(`✅ Restored ${res.learners ?? 0} learner(s) from the cloud. Reloading…`);
            setTimeout(() => window.location.reload(), 700);
        } else {
            setCloudMsg(`❌ ${res.error || 'Cloud restore failed.'}`);
        }
    };

    const handleCloudDelete = async () => {
        if (!confirm('Delete the cloud copy of your data?\n\nYour hard disk folder and this browser are NOT touched.')) return;
        setCloudBusy('deleting');
        const res = await deleteCloudBackup();
        setCloudBusy('idle');
        setCloudMsg(res.success ? 'Cloud copy deleted.' : `❌ ${res.error || 'Could not delete the cloud copy.'}`);
        void refreshCloudInfo();
    };

    const handleRestoreSafetyCopy = async () => {
        const ok = await restoreFromSafetyCopy({ replaceLearners: true });
        if (ok) {
            alert("✅ Restored from the browser's safety copy — reloading so every dashboard shows it.");
            window.location.reload();
        } else {
            alert("There is no safety copy in this browser yet. It is written automatically after every successful backup to the folder (and, for VIP, the cloud).");
        }
    };

    /** Back-up Suite: the whole workspace as one portable file. */
    const handleExportBackupFile = async () => {
        setFileBusy('export');
        try {
            const res = await downloadFullBackupFile();
            alert(res.ok
                ? `✅ Back-up file saved (${((res.bytes || 0) / 1024 / 1024).toFixed(1)} MB, ${res.learners ?? 0} adult learner(s)). It holds everything — learners and lessons, the classroom, the kids kingdom, custom photos and widget data.`
                : `Could not create the backup file: ${res.error || 'unknown error'}`);
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
                alert(`✅ Import complete — ${res.learners ?? 0} adult learner(s) restored. Reloading…`);
                window.location.reload();
            } else {
                alert(`Import failed: ${res.error || 'the file could not be read.'}`);
            }
        } finally {
            setFileBusy('idle');
        }
    };

    const handleSave = () => {
        setTutorInfo({ 
            name, 
            email, 
            interests, 
            teachingMethod, 
            bio, 
            tutorFacts, 
            timezone, 
            baseTotal, 
            sendGridApiKey, 
            sendingEmail, 
            emailTemplate, 
            splashScreenText, 
            splashScreenSubtext, 
            enableSplashScreens,
            subscribeEmail,
            subscribeEnabled,
            voice: tutorVoice
        });
        setAppName(appName);
        setAppAddress(appAddress);
        setLogoUrl(logo);
        onClose();
        alert("Settings saved!");
        
        // Force synchronous or immediate disk sync if disk mode is enabled
        if (isDiskModeEnabled()) {
            triggerAutoSync(true);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="General Settings">
            <div className="space-y-6 max-h-[80vh] overflow-y-auto px-2 pb-10" onPaste={handlePaste}>
                
                <div className="flex border-b">
                    <button 
                        onClick={() => setActiveTab('profile')} 
                        className={`px-4 py-3 font-bold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Tutor Profile
                    </button>
                    <button 
                        onClick={() => setActiveTab('app')} 
                        className={`px-4 py-3 font-bold border-b-2 transition-colors ${activeTab === 'app' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        App Settings
                    </button>
                    <button 
                        onClick={() => setActiveTab('disk')} 
                        className={`px-4 py-3 font-bold border-b-2 transition-colors ${activeTab === 'disk' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fas fa-hdd mr-1 text-xs"></i> Back-up Suite
                    </button>
                </div>

                {activeTab === 'profile' && (
                <div className="flex flex-col md:flex-row gap-6 animate-fade-in">
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-semibold mb-1">Your Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block font-semibold mb-1">Your Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block font-semibold mb-1">Timezone</label>
                                <div className="flex gap-2 items-center">
                                    <input type="text" value={timezone} onChange={e => setTimezone(e.target.value)} className={inputClass} placeholder="e.g. America/Toronto" />
                                    <ServerTime className="text-sm font-mono whitespace-nowrap bg-gray-100 px-3 py-2 rounded-lg border border-gray-200" />
                                </div>
                            </div>
                            <div>
                                <label className="block font-semibold mb-1">Base Total Stats</label>
                                <input type="number" value={baseTotal} onChange={e => setBaseTotal(parseInt(e.target.value) || 0)} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Bio</label>
                            <textarea value={bio} onChange={e => setBio(e.target.value)} className={inputClass} rows={2} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Tutor Facts (Personal Info)</label>
                            <textarea value={tutorFacts} onChange={e => setTutorFacts(e.target.value)} className={inputClass} rows={2} placeholder="Share random facts, hobbies, or traits" />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Interests</label>
                            <input type="text" value={interests} onChange={e => setInterests(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Teaching Method</label>
                            <input type="text" value={teachingMethod} onChange={e => setTeachingMethod(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Read Aloud Voice <span className="text-xs font-normal text-gray-400">(tutor voice, defaults to Microsoft Ryan Natural)</span></label>
                            <SearchableVoiceSelect value={tutorVoice} onChange={setTutorVoice} hideCharacters />
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-start space-y-2 pt-8">
                        <label className="block font-semibold">Tutor Logo / Avatar</label>
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            {logo && logo.startsWith('data:image') ? (
                                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl">📸</span>
                            )}
                        </div>
                        <button onClick={initiatePaste} className="text-sm text-brand-blue hover:text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded-full">
                            <i className="fas fa-clipboard mr-1"></i> Paste Image
                        </button>
                    </div>
                </div>
                )}

                {activeTab === 'app' && (
                <div className="pt-4 animate-fade-in">
                    <h3 className="text-lg font-bold border-b pb-2 mb-4">Branding & App Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block font-semibold mb-1">App Name</label>
                            <input type="text" value={appName} onChange={e => setAppNameLocal(e.target.value)} className={inputClass} placeholder="e.g. Tutor Academy" />
                            <p className="text-xs text-gray-500 mt-1">Displayed in the dashboard and headers.</p>
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">App Address / Website</label>
                            <input type="text" value={appAddress} onChange={e => setAppAddressLocal(e.target.value)} className={inputClass} placeholder="e.g. my-tutor-site.com" />
                            <p className="text-xs text-gray-500 mt-1">Used for HTML lessons and generated content.</p>
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Splash Screen Text</label>
                            <input type="text" value={splashScreenText} onChange={e => setSplashScreenText(e.target.value)} className={inputClass} placeholder="e.g. Tutorly Presents" />
                            <p className="text-xs text-gray-500 mt-1">Main text shown to users when entering an app area. Also shown on the start page of every game in the Game Hub.</p>
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Splash Screen Subtext</label>
                            <input type="text" value={splashScreenSubtext} onChange={e => setSplashScreenSubtext(e.target.value)} className={inputClass} placeholder="e.g. Welcome to your learning journey" />
                            <p className="text-xs text-gray-500 mt-1">Your logo, splash text and subtext are shared with every Game Hub game — change them here and the games update too.</p>
                        </div>
                        <div className="flex items-center mt-2">
                            <input type="checkbox" id="enableSplash" checked={enableSplashScreens} onChange={e => setEnableSplashScreens(e.target.checked)} className="mr-2" />
                            <label htmlFor="enableSplash" className="font-semibold">Enable Splash Screens in generated HTML apps and games</label>
                        </div>

                        <hr className="my-4 border-gray-100" />
                        <h4 className="text-md font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <i className="fas fa-bell text-red-500 text-sm"></i> Subscribe Button in Lessons
                        </h4>
                        <div>
                            <label className="block font-semibold mb-1">Email Address for Subscriptions</label>
                            <input 
                                type="text" 
                                value={subscribeEmail} 
                                onChange={e => setSubscribeEmail(e.target.value)} 
                                className={inputClass} 
                                placeholder="e.g. tutor@example.com" 
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave blank to show a popup with the email address when users click Subscribe.</p>
                        </div>
                        <div className="flex items-center mt-2">
                            <input 
                                type="checkbox" 
                                id="subscribeEnabled" 
                                checked={subscribeEnabled} 
                                onChange={e => setSubscribeEnabled(e.target.checked)} 
                                className="mr-2" 
                            />
                            <label htmlFor="subscribeEnabled" className="font-semibold cursor-pointer">
                                Enable Subscribe button in exported lessons
                            </label>
                        </div>
                    </div>
                </div>
                )}

                {activeTab === 'disk' && (
                <div className="pt-4 animate-fade-in space-y-6">
                    <div>
                        <h3 className="text-lg font-bold border-b pb-2 mb-2">Back-up Suite</h3>
                        <p className="text-sm text-gray-600">
                            Choose where your work is saved. Both options keep learners, sessions and feedback,
                            schedules, todos, bookings and settings — generated lesson files always stay on your hard drive.
                        </p>
                    </div>

                    {/* Where to save: Hard Disk (any tier) or VIP Cloud */}
                    <div className="p-4 border border-gray-200 rounded-xl space-y-3">
                        <h4 className="font-bold text-gray-800 text-sm">Where should we save your backups?</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleChooseBackupTarget('disk')}
                                className={`text-left p-3 rounded-xl border-2 transition cursor-pointer ${backupTarget === 'disk' ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                                <div className="flex items-center gap-2 font-bold text-sm text-gray-800">
                                    <i className="fas fa-hdd text-indigo-600"></i> Hard Disk
                                    {backupTarget === 'disk' && <span className="ml-auto text-[10px] font-black text-brand-blue uppercase">Selected</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">A folder on this computer. Included with every plan.</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleChooseBackupTarget('cloud')}
                                disabled={!isVip}
                                className={`text-left p-3 rounded-xl border-2 transition cursor-pointer ${backupTarget === 'cloud' ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-200 bg-white hover:border-gray-300'} ${!isVip ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex items-center gap-2 font-bold text-sm text-gray-800">
                                    <i className="fas fa-cloud text-sky-600"></i> Cloud (VIP)
                                    {!isVip && <span className="ml-auto text-[10px] font-black text-amber-600 uppercase">VIP only</span>}
                                    {isVip && backupTarget === 'cloud' && <span className="ml-auto text-[10px] font-black text-brand-blue uppercase">Selected</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Saved on the server database — survives a wiped browser or a lost folder.</p>
                            </button>
                        </div>

                        {backupTarget === 'cloud' && isVip && (
                            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-sky-900">
                                    <span><i className="fas fa-database mr-1"></i>
                                        {cloudInfo?.exists
                                            ? `Cloud copy: ${(cloudInfo.bytes / 1024).toFixed(1)} KB · rev ${cloudInfo.revision}${cloudInfo.updatedAt ? ` · ${new Date(cloudInfo.updatedAt).toLocaleString()}` : ''}${cloudInfo.device ? ` · ${cloudInfo.device}` : ''}`
                                            : 'No cloud copy yet — press “Save to Cloud Now”.'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCloudSaveNow}
                                        disabled={cloudBusy !== 'idle'}
                                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
                                    >
                                        {cloudBusy === 'saving' ? 'Saving…' : '☁️ Save to Cloud Now'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCloudRestore}
                                        disabled={cloudBusy !== 'idle'}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
                                    >
                                        {cloudBusy === 'loading' ? 'Restoring…' : '⬇️ Restore from Cloud'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={refreshCloudInfo}
                                        disabled={cloudBusy !== 'idle'}
                                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
                                    >
                                        ↻ Refresh
                                    </button>
                                    {cloudInfo?.exists && (
                                        <button
                                            type="button"
                                            onClick={handleCloudDelete}
                                            disabled={cloudBusy !== 'idle'}
                                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
                                        >
                                            {cloudBusy === 'deleting' ? 'Deleting…' : 'Delete Cloud Copy'}
                                        </button>
                                    )}
                                </div>
                                {cloudInfo?.sections && cloudInfo.sections.length > 0 && (
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-sky-800/80">
                                        {cloudInfo.sections.filter(s => s.count > 0).map(s => (
                                            <span key={s.section}>{s.count} {s.section}</span>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[11px] text-sky-900/70">
                                    The save card in the bottom-right corner, and the Kids dashboard card, both follow this choice.
                                    Cloud copies are capped at 50 MB compressed — keep generated lesson files on your hard disk.
                                </p>
                            </div>
                        )}

                        {backupTarget === 'cloud' && !isVip && (
                            <p className="text-xs font-semibold text-amber-700">
                                Cloud saving is available on the VIP plan. Your data is still saved to your hard disk folder.
                            </p>
                        )}

                        {cloudMsg && (
                            <p className="text-xs font-semibold text-gray-700 break-words">{cloudMsg}</p>
                        )}
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
                                        <div className="p-3 bg-brand-blue/10 text-brand-blue rounded-xl">
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
                                            className="px-4 py-2 bg-brand-blue text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition cursor-pointer"
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
                            <div className="p-4 bg-brand-blue/5 border border-brand-blue/20 rounded-xl space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                            <span className="flex h-2.5 w-2.5 rounded-full bg-brand-blue animate-pulse"></span>
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
                                            className="w-5 h-5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Operations */}
                            {directoryHandle && (
                                <div className="p-4 border border-gray-200 rounded-xl space-y-4">
                                    <h4 className="font-bold text-gray-800 text-sm">Backup Actions</h4>

                                    {(() => {
                                        const status = getDiskRestoreStatus();
                                        if (status === 'needs-permission') {
                                            return (
                                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold">
                                                    <i className="fas fa-key mr-1"></i> This browser can't re-open your backup folder on its own — click <strong>Authorize Folder Access</strong> above, then <strong>Restore All from Folder</strong>. Your data is safe meanwhile (a safety copy is kept in this browser).
                                                </div>
                                            );
                                        }
                                        if (status === 'safety') {
                                            return (
                                                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold">
                                                    <i className="fas fa-life-ring mr-1"></i> The folder could not be read, so your data was restored from this browser's safety copy. Reconnect the folder to sync it back to disk.
                                                </div>
                                            );
                                        }
                                        if (status === 'empty-folder') {
                                            return (
                                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold">
                                                    <i className="fas fa-folder-open mr-1"></i> The connected folder holds no backup yet — use <strong>Export All to Folder</strong> to write one.
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                                            <h5 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Initial Export</h5>
                                            <p className="text-xs text-gray-500">
                                                Write all current learners and generated lessons in this browser to the connected folder.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleInitialExport}
                                                disabled={syncStatus !== 'idle'}
                                                className="w-full px-3 py-1.5 bg-brand-green text-white text-xs font-bold rounded-lg hover:bg-green-600 transition disabled:opacity-50 cursor-pointer"
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
                                                className="w-full px-3 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition disabled:opacity-50 cursor-pointer"
                                            >
                                                {syncStatus === 'importing' ? 'Importing...' : 'Restore All from Folder'}
                                            </button>
                                        </div>

                                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                                            <h5 className="font-bold text-xs text-emerald-800 uppercase tracking-wider">Last-Resort Restore</h5>
                                            <p className="text-xs text-emerald-900/80">
                                                Restores the safety copy this browser keeps on its own. Works even when the folder is gone, unplugged or no longer authorized.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleRestoreSafetyCopy}
                                                disabled={syncStatus !== 'idle'}
                                                className="w-full px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                                            >
                                                <i className="fas fa-life-ring mr-1"></i> Restore From Safety Copy
                                            </button>
                                        </div>

                                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2 md:col-span-2">
                                            <h5 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Back-up Suite — Full File</h5>
                                            <p className="text-xs text-gray-500">
                                                Save everything into one portable JSON file, or import one back. Works without a folder, and understands older backup files too.
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
                                                    className="bg-brand-blue h-2 rounded-full transition-all duration-300" 
                                                    style={{ width: `${syncProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-white">
                    <button type="button" onClick={onClose} className="bg-gray-200 font-bold px-4 py-2 rounded-lg">Cancel</button>
                    <button type="button" onClick={handleSave} className="bg-brand-green text-white font-bold px-4 py-2 rounded-lg">Save Settings</button>
                </div>
            </div>
        </Modal>
    );
};

export default TutorSettingsModal;
