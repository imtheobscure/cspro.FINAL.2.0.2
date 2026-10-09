import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';

type PeerRole = 'tutor' | 'learner' | null;

interface PeerContextType {
  peer: Peer | null;
  peerId: string | null;
  role: PeerRole;
  connections: DataConnection[];
  connectToTutor: (tutorId: string) => void;
  startTutorSession: () => void;
  broadcast: (type: string, payload: any) => void;
  messages: any[];
  sendMessage: (text: string) => void;
  cursors: Record<string, { x: number; y: number; name: string }>;
  annotations: any[];
  addAnnotation: (annotation: any) => void;
  clearAnnotations: () => void;
  userName: string;
  setUserName: (name: string) => void;
}

export const PeerContext = createContext<PeerContextType>({
  peer: null,
  peerId: null,
  role: null,
  connections: [],
  connectToTutor: () => {},
  startTutorSession: () => {},
  broadcast: () => {},
  messages: [],
  sendMessage: () => {},
  cursors: {},
  annotations: [],
  addAnnotation: () => {},
  clearAnnotations: () => {},
  userName: 'Anonymous',
  setUserName: () => {},
});

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [role, setRole] = useState<PeerRole>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; name: string }>>({});
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [userName, setUserName] = useState('Anonymous');

  const connectionsRef = useRef<DataConnection[]>([]);
  connectionsRef.current = connections;

  const handleData = (data: any, conn: DataConnection) => {
    if (!data || !data.type) return;
    
    switch (data.type) {
      case 'chat':
        setMessages(prev => [...prev, data.payload]);
        if (role === 'tutor') broadcast('chat', data.payload, conn.peer);
        break;
      case 'cursor':
        setCursors(prev => ({
          ...prev,
          [conn.peer]: { ...data.payload, name: data.payload.name || 'Learner' }
        }));
        if (role === 'tutor') broadcast('cursor', { ...data.payload, peerId: conn.peer }, conn.peer);
        break;
      case 'annotation':
        setAnnotations(prev => [...prev, data.payload]);
        if (role === 'tutor') broadcast('annotation', data.payload, conn.peer);
        break;
      case 'clear_annotations':
        setAnnotations([]);
        if (role === 'tutor') broadcast('clear_annotations', null, conn.peer);
        break;
      case 'widget_sync':
      case 'game_interaction':
        // Handle widget and game sync
        window.dispatchEvent(new CustomEvent('peer_sync', { detail: data }));
        if (role === 'tutor') broadcast(data.type, data.payload, conn.peer);
        break;
    }
  };

  const broadcast = (type: string, payload: any, excludePeer?: string) => {
    const data = { type, payload };
    connectionsRef.current.forEach(conn => {
      if (conn.peer !== excludePeer && conn.open) {
        conn.send(data);
      }
    });
  };

  const startTutorSession = () => {
    const newPeer = new Peer();
    newPeer.on('open', (id) => {
      setPeerId(id);
      setRole('tutor');
    });

    newPeer.on('connection', (conn) => {
      conn.on('open', () => {
        setConnections(prev => [...prev, conn]);
        // Send current state to new learner
        conn.send({ type: 'sync_state', payload: { annotations } });
      });
      conn.on('data', (data) => handleData(data, conn));
      conn.on('close', () => {
        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
        setCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[conn.peer];
          return newCursors;
        });
      });
    });
    
    newPeer.on('error', (err: any) => {
        alert("PeerJS Connection Error: " + err.message + "\n\nNote: If you're in a region with restricted internet, default WebRTC servers may be blocked.");
    });

    setPeer(newPeer);
  };

  const connectToTutor = (tutorId: string) => {
    const newPeer = new Peer();
    newPeer.on('open', (id) => {
      setPeerId(id);
      setRole('learner');
      const conn = newPeer.connect(tutorId);
      conn.on('open', () => {
        setConnections([conn]);
      });
      conn.on('data', (data: any) => {
        if (data.type === 'sync_state') {
          setAnnotations(data.payload.annotations || []);
        } else if (data.type === 'cursor' && data.payload.peerId) {
           setCursors(prev => ({
             ...prev,
             [data.payload.peerId]: data.payload
           }));
        } else {
          handleData(data, conn);
        }
      });
      conn.on('close', () => {
        setConnections([]);
      });
    });
    newPeer.on('error', (err: any) => {
        alert("PeerJS Connection Error: " + err.message + "\n\nNote: If you're in a region with restricted internet, default WebRTC servers may be blocked.");
    });
    setPeer(newPeer);
  };

  const sendMessage = (text: string) => {
    const msg = { text, sender: userName, time: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
    broadcast('chat', msg);
  };

  const addAnnotation = (annotation: any) => {
    setAnnotations(prev => [...prev, annotation]);
    broadcast('annotation', annotation);
  };

  const clearAnnotations = () => {
    setAnnotations([]);
    broadcast('clear_annotations', null);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (role && connectionsRef.current.length > 0) {
        broadcast('cursor', { x: e.clientX, y: e.clientY, name: userName });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [role, userName]);

  return (
    <PeerContext.Provider value={{
      peer, peerId, role, connections, connectToTutor, startTutorSession,
      broadcast, messages, sendMessage, cursors, annotations, addAnnotation, clearAnnotations,
      userName, setUserName
    }}>
      {children}
    </PeerContext.Provider>
  );
};
