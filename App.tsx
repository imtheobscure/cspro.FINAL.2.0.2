
import React, { useEffect, useRef, useState, FC } from 'react';
import { HashRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { loadAllCustomAvatars } from './services/customAvatarStore';
import type { LearnerProfile, LearnerContent, PlaceGame, PlatformProfile, GroupClass, TutorProfile } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useIdbStorage } from './hooks/useIdbStorage';
import Header from './components/app2/Header';
import WeeklyCompetitionEngine from './components/app2/WeeklyCompetitionEngine';
import DashboardPage, { type DailyLesson, type ConversationGame } from './pages/DashboardPage';
import LearnerProfilePage from './pages/app2/LearnerProfile';
import GroupProfile from './pages/app2/GroupProfile';
import Onboarding from './pages/app2/Onboarding';
import PlatformPage from './pages/app2/PlatformProfile';
import HomePage from './pages/HomePage';
import ContentLibraryPage from './pages/ContentLibraryPage';
import LiveSessionPage from './pages/LiveSessionPage';
import FlipBookLivePage from './pages/flipbook/FlipBookLivePage';
import GamifiedLivePage from './pages/gamified/GamifiedLivePage';
import MusicLivePage from './pages/music/MusicLivePage';
import DailyLivePage from './pages/daily/DailyLivePage';
import LiveLivePage from './pages/live/LiveLivePage';
import VideoLivePage from './pages/video/VideoLivePage';
import KidsApp from './pages/kids/KidsApp';
import TutorProfileModal from './components/profile/TutorProfileModal';
import { Navigate } from 'react-router-dom';
import { generateHash } from './utils/auth';
import { PeerProvider } from './components/classroom/PeerContext';
import { useAppStore } from './store/useAppStore';
import { useLearnerStore } from './store/useLearnerStore';
import AIConfirmationModal from './components/app2/profile/AIConfirmationModal';
import SaveToDiskPrompt from './components/app2/SaveToDiskPrompt';
import { mapUserJsonProfileToLearnerProfile } from './services/profileMapper';

import GoogleTranslateWidget from './components/ui/GoogleTranslateWidget';
import GlobalTimer from './components/app2/profile/GlobalTimer';
import SEOManager from './components/SEOManager';
import AuthModal from './components/auth/AuthModal';
import UpgradeModal from './components/auth/UpgradeModal';
import AdminConsoleModal from './components/admin/AdminConsoleModal';
import { useAuthStore } from './store/useAuthStore';

const GlobalModals: FC = () => {
    const pendingAIConfirmation = useAppStore(state => state.pendingAIConfirmation);
    const setPendingAIConfirmation = useAppStore(state => state.setPendingAIConfirmation);
    const finalizeSessionWithAI = useLearnerStore(state => state.finalizeSessionWithAI);

    return (
        <>
            <AuthModal />
            <UpgradeModal />
            <AdminConsoleModal />
            {pendingAIConfirmation && (
                <AIConfirmationModal 
                    data={pendingAIConfirmation}
                    onConfirm={async (learnerId, sessionData, confirmedData) => {
                        await finalizeSessionWithAI(learnerId, sessionData, confirmedData);
                        setPendingAIConfirmation(null);
                    }}
                    onCancel={() => setPendingAIConfirmation(null)}
                />
            )}
        </>
    );
};

const dehydrateLearnersList = (list: any[]): any[] => {
    if (!list || !Array.isArray(list)) return [];
    return list.map(learner => {
        const cleanLearner = { ...learner };
        if (cleanLearner.sessions && Array.isArray(cleanLearner.sessions)) {
            cleanLearner.sessions = cleanLearner.sessions.map((s: any) => {
                const sessionCopy = { ...s };
                if (sessionCopy.script && sessionCopy.script.length > 3000) {
                    sessionCopy.script = sessionCopy.script.substring(0, 3000) + "\n\n[Transcript truncated to save space]";
                }
                if (sessionCopy.chatMessages && Array.isArray(sessionCopy.chatMessages) && sessionCopy.chatMessages.length > 20) {
                    sessionCopy.chatMessages = sessionCopy.chatMessages.slice(-15);
                }
                // Strip giant html values to protect localStorage space
                Object.keys(sessionCopy).forEach(k => {
                    const val = sessionCopy[k];
                    if (typeof val === 'string' && val.length > 3000) {
                        if (val.includes('<html') || val.includes('<div') || val.includes('class=')) {
                            sessionCopy[k] = '[HTML string stripped to prevent storage limit errors]';
                        }
                    }
                });
                return sessionCopy;
            });
        }
        return cleanLearner;
    });
};

const DashboardLayout: FC = () => {
    const location = useLocation();

    React.useLayoutEffect(() => {
        const storedTheme = localStorage.getItem('theme') || 'light';
        const html = document.documentElement;
        const body = document.body;
        if (storedTheme === 'dark') {
            html.classList.add('dark');
            body.classList.add('dark');
        } else {
            html.classList.remove('dark');
            body.classList.remove('dark');
        }
    }, [location.pathname]);

    /*
     * The onboarding deck is a presentation, not a page in a column: it is shown to a
     * learner on a projector, and the `container` wrapper capped it at a reading width and
     * centred it, so a 1920px screen had a third of it as empty margin. Every other route
     * keeps the reading column; the slides get the whole viewport width.
     */
    const fullBleed = location.pathname.startsWith("/onboarding");

    return (
        <div className="min-h-screen bg-gray-100 relative">
            <WeeklyCompetitionEngine />
            <Header />
            <main className={fullBleed ? "text-gray-900" : "container mx-auto p-4 sm:p-6 text-gray-900"}>
                <Outlet />
            </main>
            <SaveToDiskPrompt />
        </div>
    );
};

const App: FC = () => {
  const storeLearners = useLearnerStore(state => state.learners);
  const storeGroups = useLearnerStore(state => state.groupClasses);

  // Map Zustand Learner to legacy LearnerProfile structures that children expect
  const learners = React.useMemo(() => {
    return storeLearners.map(l => {
      if ('cefrLevel' in l && 'targetLanguage' in l && 'personalInfo' in l) return l as any;
      return mapUserJsonProfileToLearnerProfile(l as any);
    });
  }, [storeLearners]);

  const setLearners = React.useCallback((val: React.SetStateAction<LearnerProfile[]>) => {
    const current = useLearnerStore.getState().learners;
    const next = typeof val === 'function' ? (val as Function)(current) : val;
    useLearnerStore.setState({ learners: next });
  }, []);

  const groupClasses = storeGroups as any;
  const setGroupClasses = React.useCallback((val: React.SetStateAction<any[]>) => {
    const current = useLearnerStore.getState().groupClasses;
    const next = typeof val === 'function' ? (val as Function)(current) : val;
    useLearnerStore.setState({ groupClasses: next });
  }, []);

  const [platforms, setPlatforms] = useLocalStorage<PlatformProfile[]>('tutor-crafter-platforms', []);
  const [allContent, setAllContent, allContentLoaded] = useIdbStorage<Record<string, LearnerContent>>('tutor-crafter-content', {});
  const [groupContent, setGroupContent, groupContentLoaded] = useIdbStorage<Record<string, LearnerContent>>('tutor-crafter-group-content', {});
  const [platformContent, setPlatformContent, platformContentLoaded] = useIdbStorage<Record<string, LearnerContent>>('tutor-crafter-platform-content', {});
  
  const isStorageReady = allContentLoaded && groupContentLoaded && platformContentLoaded;
  const [diskRestoreReady, setDiskRestoreReady] = useState(false);
  
  useEffect(() => {
    loadAllCustomAvatars();
    useAuthStore.getState().initAuth();
    
    const initDiskAndSubscribe = async () => {
      try {
        const { triggerAutoSync, ensureStartupDiskRestore, scheduleLocalRescueCopy } = await import('./utils/diskStorage');
        
        await ensureStartupDiskRestore();

        // With the restore finished, take the first local rescue copy straight
        // away so this session is protected even if it is closed in a moment.
        void scheduleLocalRescueCopy(0);

        // useIdbStorage may have read the old browser snapshot before the disk
        // restore finished. Refresh its React state from the restored IndexedDB
        // values before allowing dashboards to mount.
        const idb = await import('idb-keyval');
        const [restoredContent, restoredGroupContent, restoredPlatformContent] = await Promise.all([
          idb.get<Record<string, LearnerContent>>('tutor-crafter-content'),
          idb.get<Record<string, LearnerContent>>('tutor-crafter-group-content'),
          idb.get<Record<string, LearnerContent>>('tutor-crafter-platform-content'),
        ]);
        if (restoredContent !== undefined) setAllContent(restoredContent || {});
        if (restoredGroupContent !== undefined) setGroupContent(restoredGroupContent || {});
        if (restoredPlatformContent !== undefined) setPlatformContent(restoredPlatformContent || {});


        // Do not subscribe until restore is complete. This prevents restoring a
        // backup from immediately triggering a save of half-restored state.
        const unsubLearner = useLearnerStore.subscribe((state, previous) => {
          if (state.learners !== previous.learners || state.groupClasses !== previous.groupClasses) {
            triggerAutoSync();
            // Keep a second, folder-independent copy of the roster in this browser.
            scheduleLocalRescueCopy();
          }
        });
        const unsubApp = useAppStore.subscribe((state, previous) => {
          if (
            state.tutorInfo !== previous.tutorInfo ||
            state.appName !== previous.appName ||
            state.appAddress !== previous.appAddress ||
            state.logoUrl !== previous.logoUrl ||
            state.characters !== previous.characters
          ) {
            triggerAutoSync();
          }
        });

        return () => {
          unsubLearner();
          unsubApp();
        };
      } catch (e) {
        console.warn("Failed to initialize background disk sync:", e);
      } finally {
        setDiskRestoreReady(true);
      }
    };

    const cleanupPromise = initDiskAndSubscribe();
    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, []);
  
  const appCharacters = useAppStore(state => state.characters);
  useEffect(() => {
    if (appCharacters && appCharacters.length > 0) {
      (window as any).__APP_CHARACTERS = appCharacters;
    }
  }, [appCharacters]);

  // Daily lessons are no longer persisted to save space, but we keep state for current session
  const [dailyLessons, setDailyLessons] = useState<DailyLesson[]>([]); 
  const [conversationGames, setConversationGames] = useLocalStorage<ConversationGame[]>('tutor-crafter-conv-games', []);
  const [placeGames, setPlaceGames] = useLocalStorage<PlaceGame[]>('tutor-crafter-place-games', []);
  const [recentLearnerIds, setRecentLearnerIds] = useLocalStorage<string[]>('tutor-crafter-recent-ids', []);
  
  const tutorInfo = useAppStore(state => state.tutorInfo);
  const tutorProfile: TutorProfile = {
      name: tutorInfo.name || 'Tutor',
      interests: tutorInfo.interests || '',
      teachingMethod: tutorInfo.teachingMethod || '',
      bio: tutorInfo.bio || '',
      useForPersonalization: tutorInfo.useForPersonalization ?? true,
      baseTotal: tutorInfo.baseTotal
  };
  const setTutorProfile = (p: TutorProfile) => useAppStore.getState().setTutorInfo({
      name: p.name,
      interests: p.interests,
      teachingMethod: p.teachingMethod,
      bio: p.bio,
      useForPersonalization: p.useForPersonalization,
      baseTotal: p.baseTotal
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-load speech synthesis voices to prevent issues on some browsers.
  useEffect(() => {
    if (typeof window.speechSynthesis !== 'undefined') {
        // This is a common trick to kickstart voice loading in some browsers.
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.onvoiceschanged !== null) {
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }
    }
  }, []);

  const handleExportLearners = () => {
      // Export Profiles, Groups, Settings, Platforms - but NO Generated Content (lessons/homework html strings)
      // IMPORTANT: export the STORE learners (the source of truth) rather than the
      // legacy-mapped `learners` view, so the backup file can never be missing
      // structured fields such as competencies, needs, level or the full course plan.
      const exportData = { 
          learners: useLearnerStore.getState().learners,
          groupClasses,
          platforms,
          tutorProfile,
          appName: useAppStore.getState().appName,
          appAddress: useAppStore.getState().appAddress,
          // We include metadata if needed, but explicitly excluding the heavy 'content' and 'groupContent' maps
          // to keep the file size manageable for settings backups.
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', 'tutor-crafter-settings-backup.json');
      linkElement.click();
  };

  const handleExportRecentContent = () => {
      // Export last 5 learners AND their content
      const recentIds = recentLearnerIds.slice(0, 5);
      // Use the store records so backups keep competencies/needs/level intact.
      const recentLearners = useLearnerStore.getState().learners.filter(l => recentIds.includes(l.id));
      const recentContent: Record<string, LearnerContent> = {};
      
      recentIds.forEach(id => {
          if (allContent[id]) {
              recentContent[id] = allContent[id];
          }
      });

      const exportData = {
          learners: recentLearners,
          content: recentContent,
          timestamp: new Date().toISOString(),
          description: "Recent 5 Users + Content Backup"
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', 'tutor-crafter-recent-content.json');
      linkElement.click();
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result as string;
              const data = JSON.parse(text);

              // Check for the minimal valid format
              if (data.learners && Array.isArray(data.learners)) {
                  
                  // MERGE LOGIC for learners: Update existing learners and add new ones.
                  setLearners(prevLearners => {
                      const learnersMap = new Map(prevLearners.map(l => [l.id, l]));
                      data.learners.forEach((importedLearner: LearnerProfile) => {
                          learnersMap.set(importedLearner.id, importedLearner);
                      });
                      return Array.from(learnersMap.values());
                  });

                  // MERGE LOGIC for Content (if present in backup)
                  if (data.content) {
                      setAllContent(prevContent => ({
                          ...prevContent,
                          ...data.content
                      }));
                  }

                  // MERGE LOGIC for groups
                  if (data.groupClasses && Array.isArray(data.groupClasses)) {
                      setGroupClasses(prevGroups => {
                          const groupsMap = new Map(prevGroups.map(g => [g.id, g]));
                          data.groupClasses.forEach((importedGroup: GroupClass) => {
                              groupsMap.set(importedGroup.id, importedGroup);
                          });
                          return Array.from(groupsMap.values());
                      });
                  }

                  // MERGE LOGIC for platforms
                  if (data.platforms && Array.isArray(data.platforms)) {
                      setPlatforms(prevPlatforms => {
                          const platformsMap = new Map(prevPlatforms.map(p => [p.id, p]));
                          data.platforms.forEach((importedPlatform: PlatformProfile) => {
                              platformsMap.set(importedPlatform.id, importedPlatform);
                          });
                          return Array.from(platformsMap.values());
                      });
                  }

                  // MERGE LOGIC for Tutor Profile
                  if (data.tutorProfile) {
                      setTutorProfile(data.tutorProfile);
                  }

                  if (data.appName) {
                      useAppStore.getState().setAppName(data.appName);
                  }
                  if (data.appAddress) {
                      useAppStore.getState().setAppAddress(data.appAddress);
                  }

                  alert('Import successful!');
              } else {
                  throw new Error('Invalid backup file format. Must contain a "learners" array.');
              }
          } catch (err) {
              const errorMsg = err instanceof Error ? err.message : 'Unknown error';
              console.error('Failed to import data:', err);
              alert(`Error importing data: ${errorMsg}`);
          }
      };
      reader.onerror = () => {
          alert('Error reading the file.');
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset file input
  };

  if (!isStorageReady || !diskRestoreReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <SEOManager />
      <PeerProvider>
        <GoogleTranslateWidget />
        <GlobalModals />
        <GlobalTimer />
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/kids" element={<KidsApp />} />
            <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage 
                  learners={learners} 
                  setLearners={setLearners}
                  groupClasses={groupClasses}
                  setGroupClasses={setGroupClasses}
                  platforms={platforms}
                  setPlatforms={setPlatforms}
                  allContent={allContent} 
                  setAllContent={setAllContent}
                  groupContent={groupContent}
                  setGroupContent={setGroupContent}
                  platformContent={platformContent}
                  setPlatformContent={setPlatformContent}
                  dailyLessons={dailyLessons}
                  setDailyLessons={setDailyLessons}
                  conversationGames={conversationGames}
                  setConversationGames={setConversationGames}
                  placeGames={placeGames}
                  setPlaceGames={setPlaceGames}
                  recentLearnerIds={recentLearnerIds}
                  setRecentLearnerIds={setRecentLearnerIds}
                  tutorProfile={tutorProfile}
                  setTutorProfile={setTutorProfile}
                />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/learner/:id" element={<LearnerProfilePage learners={learners} setLearners={setLearners} allContent={allContent} setAllContent={setAllContent} recentLearnerIds={recentLearnerIds} setRecentLearnerIds={setRecentLearnerIds} platforms={platforms} tutorProfile={tutorProfile} />} />
                <Route path="/group/:id" element={<GroupProfile groups={groupClasses} setGroups={setGroupClasses} groupContent={groupContent} setGroupContent={setGroupContent} platforms={platforms} tutorProfile={tutorProfile} />} />
                <Route path="/platform/:id" element={<PlatformPage platforms={platforms} setPlatforms={setPlatforms} platformContent={platformContent} setPlatformContent={setPlatformContent} tutorProfile={tutorProfile} />} />
                <Route path="/platform" element={<Navigate to="/dashboard" replace />} />
                <Route path="/library" element={<ContentLibraryPage />} />
            </Route>
            <Route path="/live/:shareId" element={<LiveSessionPage allContent={allContent} />} />
            <Route path="/flipbook/:lessonId" element={<FlipBookLivePage />} />
            <Route path="/gamified/:lessonId" element={<GamifiedLivePage />} />
            <Route path="/music/:lessonId" element={<MusicLivePage />} />
            <Route path="/daily/:lessonId" element={<DailyLivePage />} />
            <Route path="/livelesson/:lessonId" element={<LiveLivePage />} />
            <Route path="/video/:lessonId" element={<VideoLivePage />} />
        </Routes>
      </PeerProvider>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/json" className="hidden" />
    </HashRouter>
  );
};

export default App;
