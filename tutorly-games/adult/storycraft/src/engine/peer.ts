import Peer, { DataConnection } from "peerjs";
import { store } from "./store";

type JoinMessage = { type: "JOIN"; peer: { id: string; name: string; color: string } };
type ChatMessage = { type: "CHAT"; authorId: string; authorName: string; color: string; text: string; emoji?: string };
type WirePeerMessage = JoinMessage | ChatMessage | { type: "WELCOME"; code: string };

class PeerManager {
  private peer: Peer | null = null;
  private conns = new Map<string, DataConnection>();
  private statusListeners = new Set<(status: string) => void>();

  onStatus(cb: (status: string) => void) {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private status(text: string) {
    this.statusListeners.forEach((cb) => cb(text));
  }

  host(code: string) {
    this.close();
    const peerId = this.peerId(code);
    this.peer = new Peer(peerId, { debug: 1 });
    this.peer.on("open", () => this.status(`Hosting as ${peerId}`));
    this.peer.on("connection", (conn) => this.registerConnection(conn, true));
    this.peer.on("error", (err) => this.status(`Peer error: ${err.type}`));
  }

  join(code: string, name: string, color: string) {
    this.close();
    this.peer = new Peer({ debug: 1 });
    this.peer.on("open", (id) => {
      const conn = this.peer?.connect(this.peerId(code), { reliable: true });
      if (!conn) return;
      this.registerConnection(conn, false);
      conn.on("open", () => {
        const msg: JoinMessage = { type: "JOIN", peer: { id, name, color } };
        conn.send(msg);
        store.set((s) => ({
          ...s,
          sessionPeers: [...s.sessionPeers.filter((p) => p.id !== id), { id, name, color }],
        }));
        this.status("Connected");
      });
    });
    this.peer.on("error", (err) => this.status(`Peer error: ${err.type}`));
  }

  broadcast(msg: WirePeerMessage) {
    this.conns.forEach((c) => {
      if (c.open) c.send(msg);
    });
  }

  close() {
    this.conns.forEach((c) => c.close());
    this.conns.clear();
    this.peer?.destroy();
    this.peer = null;
  }

  private registerConnection(conn: DataConnection, isHost: boolean) {
    this.conns.set(conn.peer, conn);
    conn.on("data", (raw) => {
      const msg = raw as WirePeerMessage;
      if (msg.type === "JOIN" && isHost) {
        store.set((s) => ({
          ...s,
          sessionPeers: [...s.sessionPeers.filter((p) => p.id !== msg.peer.id), msg.peer],
        }));
        conn.send({ type: "WELCOME", code: store.getSnapshot().sessionCode } satisfies WirePeerMessage);
      }
      if (msg.type === "CHAT") {
        store.set((s) => ({
          ...s,
          chat: [...s.chat, { id: crypto.randomUUID(), authorId: msg.authorId, authorName: msg.authorName, color: msg.color, text: msg.text, emoji: msg.emoji, ts: Date.now() }].slice(-500),
        }));
        if (isHost) {
          this.conns.forEach((other, peerId) => {
            if (peerId !== conn.peer && other.open) other.send(msg);
          });
        }
      }
    });
    conn.on("close", () => this.conns.delete(conn.peer));
  }

  private peerId(code: string) {
    return `tutorly-${code.trim().toUpperCase()}`;
  }
}

export const peerManager = new PeerManager();