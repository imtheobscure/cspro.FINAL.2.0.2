
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import type { LearnerContent } from '../types';
import { getCollaborationWidget } from '../utils/html/collaboration';

interface SavedContent {
  id: string;
  learnerName: string;
  type: string;
  title: string;
  html: string;
}

interface LiveSessionPageProps {
  allContent: Record<string, LearnerContent>;
}

const LiveSessionPage: React.FC<LiveSessionPageProps> = ({ allContent }) => {
  const { shareId } = useParams<{ shareId: string }>();
  const [searchParams] = useSearchParams();
  const isTutor = searchParams.get('tutor') === 'true';
  const navigate = useNavigate();
  
  const [content, setContent] = useState<SavedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [userName, setUserName] = useState(isTutor ? 'Tutor' : '');
  const [hasJoined, setHasJoined] = useState(isTutor); // Tutors auto-join

  // Fetch content from props instead of API
  useEffect(() => {
    if (!shareId || !allContent) {
        setError('No content ID provided.');
        setLoading(false);
        return;
    }

    // Try to parse composite ID: learnerId:type
    const decodedId = decodeURIComponent(shareId);
    const parts = decodedId.split(':');
    
    if (parts.length >= 2) {
        const learnerId = parts[0];
        const type = parts[1];
        
        const learnerContent = allContent[learnerId];
        if (learnerContent) {
            let foundData: any = null;
            let title = "Untitled";
            
            if (type === 'musicLesson' && learnerContent.musicLesson) {
                foundData = learnerContent.musicLesson;
                title = learnerContent.musicLesson.title;
            } else if (type === 'partyMode' && learnerContent.partyMode) {
                 setError('Party Mode content not supported in Live View yet (requires generation).');
                 setLoading(false);
                 return;
            } else if (type === 'placeGame' && learnerContent.placeGame) {
                foundData = learnerContent.placeGame;
                title = "Guess the Place";
            } else if (type === 'conversationGame' && learnerContent.conversationGame) {
                foundData = learnerContent.conversationGame;
                title = "Conversation Game";
            } else if (type === 'dailyLesson' && learnerContent.dailyLesson) {
                foundData = learnerContent.dailyLesson;
                title = "Daily Lesson";
            }

            if (foundData && foundData.htmlContent) {
                setContent({
                    id: shareId,
                    learnerName: "Learner",
                    type: type,
                    title: title,
                    html: foundData.htmlContent
                });
                setLoading(false);
                return;
            }
        }
    }
    
    setError('Content not found in local storage.');
    setLoading(false);
  }, [shareId, allContent]);

  // WebSocket Connection
  useEffect(() => {
    // Disabled as requested - WebSockets not used
    return;
  }, [hasJoined, shareId, userName, content]);

  const handleJoin = () => {
    if (userName.trim()) {
      setHasJoined(true);
    }
  };

  // Inject Widget & Scripts
  useEffect(() => {
    if (content?.html && hasJoined) {
      const container = document.getElementById('live-content-container');
      if (container) {
        // 1. Inject Content Scripts
        const scripts = container.getElementsByTagName('script');
        Array.from(scripts).forEach(script => {
          const newScript = document.createElement('script');
          Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(document.createTextNode(script.innerHTML));
          script.parentNode?.replaceChild(newScript, script);
        });

        // 2. Inject Collaboration Widget
        const { html, css, js } = getCollaborationWidget();
        
        // CSS
        const style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
        
        // HTML
        const widgetContainer = document.createElement('div');
        widgetContainer.innerHTML = html;
        document.body.appendChild(widgetContainer);
        
        // JS
        const script = document.createElement('script');
        script.innerHTML = js;
        document.body.appendChild(script);
        
        // Initialize Widget after a tick
        setTimeout(() => {
            // @ts-ignore
            if (window.reinitializeInteractiveElements) window.reinitializeInteractiveElements();
        }, 500);
      }
    }
  }, [content, hasJoined, ws]); // Re-run if WS changes to update callback closure

  if (loading) return <div className="p-10 text-center">Loading session...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Join Lesson</h1>
          <p className="text-gray-600 mb-6">{content?.title}</p>
          
          <div className="mb-4 text-left">
            <label className="block text-sm font-bold mb-2">Your Name</label>
            <input 
              type="text" 
              className="w-full p-3 border rounded-lg"
              placeholder="Enter your name..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          
          <Button className="w-full" onClick={handleJoin} disabled={!userName.trim()}>
            Join Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => navigate(isTutor ? '/library' : '/')}>
             Exit
          </Button>
          <div>
            <h1 className="font-bold text-gray-800">{content?.title}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {connected ? 'Live' : 'Disconnected'} • {userCount} Active User{userCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {isTutor && <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded font-bold">TUTOR VIEW</span>}
           <div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
             👤 {userName}
           </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content (The Lesson) */}
        <main className="flex-1 overflow-y-auto p-6 relative w-full">
           <div className="max-w-4xl mx-auto bg-white shadow-sm min-h-[80vh] rounded-xl p-8 relative">
              <div 
                id="live-content-container"
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: content?.html || '<div class="text-center p-10 text-gray-400">No content available to display.</div>' }} 
              />
           </div>
        </main>
      </div>
    </div>
  );
};

export default LiveSessionPage;

