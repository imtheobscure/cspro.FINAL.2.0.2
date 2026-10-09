"use client";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import type { ClientMessage, HostMessage } from "./types";

export const PEER_PREFIX = "tutorly-quizziz-v1-";
export const peerIdForCode = (code: string) => PEER_PREFIX + code.toUpperCase();

export function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const PEER_OPTS = {
  debug: 0,
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
    ],
  },
};

export async function createHostPeer(code: string): Promise<Peer> {
  const { default: PeerCtor } = await import("peerjs");
  return new Promise((resolve, reject) => {
    const p = new PeerCtor(peerIdForCode(code), PEER_OPTS);
    const to = setTimeout(() => reject(new Error("Signalling server timeout")), 15000);
    p.on("open", () => { clearTimeout(to); resolve(p); });
    p.on("error", (e) => { clearTimeout(to); reject(e); });
  });
}

export async function connectToHost(code: string): Promise<{ peer: Peer; conn: DataConnection }> {
  const { default: PeerCtor } = await import("peerjs");
  return new Promise((resolve, reject) => {
    const p = new PeerCtor(PEER_OPTS);
    const to = setTimeout(() => { p.destroy(); reject(new Error("Could not reach the game. Check the code and try again.")); }, 20000);
    p.on("open", () => {
      const conn = p.connect(peerIdForCode(code), { reliable: true, serialization: "json" });
      conn.on("open", () => { clearTimeout(to); resolve({ peer: p, conn }); });
      conn.on("error", (e) => { clearTimeout(to); reject(e); });
    });
    p.on("error", (e) => { clearTimeout(to); reject(e); });
  });
}

export function sendHost(conn: DataConnection, m: HostMessage) { if (conn.open) conn.send(m); }
export function sendClient(conn: DataConnection, m: ClientMessage) { if (conn.open) conn.send(m); }
