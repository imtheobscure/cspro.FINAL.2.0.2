import { useEffect, useRef, useState } from "react";
import Peer, { DataConnection } from "peerjs";
import { useStore, store } from "../state/store";
import { Btn, TInput, Label } from "../ui/primitives";

// PeerJS-based screen sharing of control (a learner can request control to scroll/click/type on the host)
// Host = tutor's classroom screen
// Guest = learner who joins via peer ID

export default function PeerPanel() {
  const peer = useStore((s) => s.peer);
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const [joinId, setJoinId] = useState("");
  const [role, setRole] = useState<"host" | "guest" | null>(null);
  const [guestConn, setGuestConn] = useState<DataConnection | null>(null);
  const [requests, setRequests] = useState<{ id: string; from: string }[]>([]);
  const [status, setStatus] = useState<string>("");
  const [hostViewport, setHostViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    return () => {
      try { peerRef.current?.destroy(); } catch {}
    };
  }, []);

  function startHost() {
    setStatus("Connecting to signaling server...");
    const p = new Peer();
    peerRef.current = p;
    p.on("open", (id) => {
      setRole("host");
      setStatus("Hosting. Share this link or code.");
      store.set((s) => {
        s.peer = { ...s.peer, hosting: true, peerId: id };
        return { ...s };
      });
    });
    p.on("connection", (conn) => {
      conn.on("open", () => {
        connectionsRef.current.push(conn);
        conn.send({ type: "welcome", viewport: { w: window.innerWidth, h: window.innerHeight } });
      });
      conn.on("data", (raw: any) => {
        const d = raw as any;
        if (d.type === "request-control") {
          setRequests((r) => r.some((x) => x.id === conn.peer) ? r : [...r, { id: conn.peer, from: d.name || "Learner" }]);
        } else if (d.type === "remote-action") {
          if (store.get().peer.controlGranted !== conn.peer) return;
          applyRemoteAction(d.action);
        }
      });
      conn.on("close", () => {
        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
        setRequests((r) => r.filter((x) => x.id !== conn.peer));
        if (store.get().peer.controlGranted === conn.peer) {
          store.set((s) => {
            s.peer = { ...s.peer, controlGranted: null };
            return { ...s };
          });
        }
      });
    });
    p.on("error", (err) => {
      setStatus("Error: " + err.message);
    });
  }

  function stopHost() {
    try { peerRef.current?.destroy(); } catch {}
    peerRef.current = null;
    connectionsRef.current = [];
    setRole(null);
    setRequests([]);
    setStatus("Stopped hosting.");
    store.set((s) => {
      s.peer = { ...s.peer, hosting: false, peerId: null, controlGranted: null };
      return { ...s };
    });
  }

  function joinAsGuest(id: string) {
    if (!id) return;
    setStatus("Connecting...");
    const p = new Peer();
    peerRef.current = p;
    p.on("open", () => {
      const c = p.connect(id, { reliable: true });
      c.on("open", () => {
        setGuestConn(c);
        setRole("guest");
        setStatus("Connected to host.");
      });
      c.on("data", (d: any) => {
        if (d.type === "welcome" && d.viewport) setHostViewport(d.viewport);
        if (d.type === "viewport" && d.viewport) setHostViewport(d.viewport);
        if (d.type === "control-granted") setStatus("✅ You have control.");
        if (d.type === "control-revoked") setStatus("Host revoked control.");
        if (d.type === "remote-action") {
          // visual ack
        }
      });
      c.on("close", () => {
        setStatus("Disconnected.");
        setRole(null);
      });
    });
    p.on("error", (err) => setStatus("Error: " + err.message));
  }

  function grantControl(peerId: string) {
    store.set((s) => {
      s.peer = { ...s.peer, controlGranted: peerId };
      return { ...s };
    });
    const conn = connectionsRef.current.find((c) => c.peer === peerId);
    conn?.send({ type: "control-granted" });
    setRequests((r) => r.filter((x) => x.id !== peerId));
  }

  function revokeControl() {
    const peerId = store.get().peer.controlGranted;
    if (peerId) {
      const c = connectionsRef.current.find((x) => x.peer === peerId);
      c?.send({ type: "control-revoked" });
    }
    store.set((s) => {
      s.peer = { ...s.peer, controlGranted: null };
      return { ...s };
    });
  }

  function requestControl() {
    if (!guestConn) return;
    guestConn.send({ type: "request-control", name: "Learner" });
    setStatus("Control requested. Waiting...");
  }

  function applyRemoteAction(a: any) {
    if (a.kind === "scroll") {
      window.scrollBy({ top: a.dy || 0, behavior: "smooth" });
    } else if (a.kind === "click") {
      const x = Math.max(0, Math.min(window.innerWidth - 1, a.x));
      const y = Math.max(0, Math.min(window.innerHeight - 1, a.y));
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      if (el) el.click();
    } else if (a.kind === "key") {
      const ae = document.activeElement as HTMLInputElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) {
        const start = ae.selectionStart ?? ae.value.length;
        ae.value = ae.value.slice(0, start) + (a.text || "") + ae.value.slice(start);
        ae.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  function sendRemoteAction(action: any) {
    guestConn?.send({ type: "remote-action", action });
  }

  useEffect(() => {
    if (role !== "host") return;
    function sendViewport() {
      connectionsRef.current.forEach((c) => c.open && c.send({ type: "viewport", viewport: { w: window.innerWidth, h: window.innerHeight } }));
    }
    window.addEventListener("resize", sendViewport);
    sendViewport();
    return () => window.removeEventListener("resize", sendViewport);
  }, [role]);

  // Guest UI: a click-pad and scroll/keyboard buttons
  useEffect(() => {
    if (role !== "guest") return;
    function key(e: KeyboardEvent) {
      if (!guestConn) return;
      if (e.key.length === 1) sendRemoteAction({ kind: "key", text: e.key });
      else if (e.key === "Enter") sendRemoteAction({ kind: "key", text: "\n" });
    }
    // Only when explicitly granted? We send anyway - host enforces
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [role, guestConn]);

  const shareUrl = peer.peerId ? `${location.origin}${location.pathname}?join=${peer.peerId}` : "";

  // Auto-host if requested elsewhere
  useEffect(() => {
    const url = new URL(location.href);
    const j = url.searchParams.get("join");
    if (j && !role) {
      setJoinId(j);
      joinAsGuest(j);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (peer.hosting && !peerRef.current && role !== "guest") startHost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer.hosting, role]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🔗</span>
          <h3 className="font-semibold text-slate-800">Share & Co-control</h3>
        </div>
        <p className="text-xs text-slate-600">Let learners join your screen and request control to scroll, click, or type.</p>
      </div>

      {role !== "guest" && (
        <div className="space-y-2">
          {!peer.hosting ? (
            <Btn variant="primary" size="lg" className="w-full" onClick={startHost}>
              🚀 Start Hosting Session
            </Btn>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <Label>Share link</Label>
                <div className="flex gap-1">
                  <TInput value={shareUrl} readOnly className="font-mono text-xs" />
                  <Btn size="sm" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy</Btn>
                </div>
                <Label>Or share code</Label>
                <div className="flex gap-1">
                  <TInput value={peer.peerId || ""} readOnly className="font-mono text-xs" />
                  <Btn size="sm" onClick={() => navigator.clipboard.writeText(peer.peerId || "")}>Copy</Btn>
                </div>
              </div>
              <Btn variant="danger" className="w-full" onClick={stopHost}>Stop Hosting</Btn>
            </>
          )}
        </div>
      )}

      {role !== "host" && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
          <Label>Join with code</Label>
          <div className="flex gap-1">
            <TInput value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="Paste host code" />
            <Btn variant="primary" size="sm" onClick={() => joinAsGuest(joinId)}>Join</Btn>
          </div>
        </div>
      )}

      {status && (
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{status}</div>
      )}

      {role === "host" && requests.length > 0 && (
        <div className="space-y-2">
          <Label>Control Requests</Label>
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <span>🙋</span>
              <span className="text-sm flex-1">{r.from}</span>
              <Btn size="sm" variant="success" onClick={() => grantControl(r.id)}>Grant</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setRequests((q) => q.filter((x) => x.id !== r.id))}>Deny</Btn>
            </div>
          ))}
        </div>
      )}

      {role === "host" && peer.controlGranted && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
          <span>✅</span>
          <span className="text-sm flex-1 truncate font-mono">{peer.controlGranted.slice(0, 12)}… has control</span>
          <Btn size="sm" variant="danger" onClick={revokeControl}>Revoke</Btn>
        </div>
      )}

      {role === "guest" && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
          <Label>Remote control</Label>
          <Btn variant="primary" className="w-full" onClick={requestControl}>Request Control</Btn>
          <div className="grid grid-cols-3 gap-1">
            <Btn size="sm" onClick={() => sendRemoteAction({ kind: "scroll", dy: -200 })}>↑ Scroll</Btn>
            <Btn size="sm" onClick={() => sendRemoteAction({ kind: "scroll", dy: 200 })}>↓ Scroll</Btn>
            <Btn size="sm" onClick={() => sendRemoteAction({ kind: "scroll", dy: 600 })}>⤓ Page</Btn>
          </div>
          <div
            onClick={(e) => {
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const rx = (e.clientX - r.left) / r.width;
              const ry = (e.clientY - r.top) / r.height;
              sendRemoteAction({
                kind: "click",
                x: Math.round(rx * hostViewport.w),
                y: Math.round(ry * hostViewport.h),
              });
            }}
            className="h-40 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs text-slate-500 cursor-crosshair"
          >
            Click pad (relative to host screen)
          </div>
          <div className="text-[10px] text-slate-400 text-right">Host viewport: {hostViewport.w}×{hostViewport.h}</div>
          <p className="text-[11px] text-slate-500">When granted, your typing in this window is sent to the host.</p>
        </div>
      )}
    </div>
  );
}
