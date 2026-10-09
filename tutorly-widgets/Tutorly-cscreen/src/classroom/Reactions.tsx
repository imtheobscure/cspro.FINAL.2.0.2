import { useEffect, useRef, useState } from "react";
import { useBus } from "../state/store";

interface FX {
  id: string;
  style: "rain" | "dance" | "explode" | "spiral" | "fountain" | "wave";
  emoji: string;
  url?: string;
}

export default function Reactions() {
  const [fx, setFx] = useState<FX | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useBus((ev) => {
    if (ev.type === "reaction-start") {
      setFx(ev.payload);
    } else if (ev.type === "reaction-stop") {
      setFx(null);
    }
  });

  useEffect(() => {
    if (!fx) return;
    let cancel = false;
    stopRef.current = () => { cancel = true; setFx(null); };
    // auto-stop after 12s if nothing stops it
    const t = setTimeout(() => { if (!cancel) setFx(null); }, 30000);
    return () => clearTimeout(t);
  }, [fx]);

  if (!fx) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[55] overflow-hidden">
      <ReactionRenderer fx={fx} />
    </div>
  );
}

function ReactionRenderer({ fx }: { fx: FX }) {
  const count = 40;
  const items = Array.from({ length: count }, (_, i) => i);
  const Visual = ({ idx: _idx }: { idx: number }) => {
    if (fx.url) return <img src={fx.url} alt="" className="w-12 h-12 object-contain" />;
    return <span className="text-5xl">{fx.emoji}</span>;
  };

  if (fx.style === "rain") {
    return (
      <>
        {items.map((i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${(i / count) * 100}%`,
              top: `-10%`,
              animation: `rainDrop ${3 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
              transform: `scale(${0.5 + Math.random() * 1})`,
            }}
          >
            <Visual idx={i} />
          </div>
        ))}
        <style>{`@keyframes rainDrop{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(120vh) rotate(360deg)}}`}</style>
      </>
    );
  }

  if (fx.style === "dance") {
    return (
      <>
        {items.slice(0, 18).map((i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${5 + (i % 6) * 16}%`,
              top: `${20 + Math.floor(i / 6) * 25}%`,
              animation: `dance ${1.5 + Math.random()}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.07}s`,
            }}
          >
            <Visual idx={i} />
          </div>
        ))}
        <style>{`@keyframes dance{0%{transform:translateY(0) rotate(-20deg) scale(1)}100%{transform:translateY(-30px) rotate(20deg) scale(1.3)}}`}</style>
      </>
    );
  }

  if (fx.style === "explode") {
    return (
      <>
        {items.map((i) => {
          const angle = (i / count) * Math.PI * 2;
          const dist = 300 + Math.random() * 300;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{
                animation: `explode 2s ease-out ${Math.random() * 0.5}s infinite`,
                ["--tx" as any]: `${Math.cos(angle) * dist}px`,
                ["--ty" as any]: `${Math.sin(angle) * dist}px`,
              }}
            >
              <Visual idx={i} />
            </div>
          );
        })}
        <style>{`@keyframes explode{0%{transform:translate(-50%,-50%) scale(0)}50%{opacity:1}100%{transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(1.5);opacity:0}}`}</style>
      </>
    );
  }

  if (fx.style === "spiral") {
    return (
      <>
        {items.map((i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{
              animation: `spiral 3s linear ${i * 0.05}s infinite`,
              ["--d" as any]: `${i * 12}deg`,
            }}
          >
            <Visual idx={i} />
          </div>
        ))}
        <style>{`@keyframes spiral{0%{transform:translate(-50%,-50%) rotate(0) translateX(0) scale(0.4)}100%{transform:translate(-50%,-50%) rotate(720deg) translateX(40vw) scale(1.2);opacity:0}}`}</style>
      </>
    );
  }

  if (fx.style === "fountain") {
    return (
      <>
        {items.map((i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: "50%",
              bottom: "-10%",
              animation: `fountain ${2 + Math.random()}s ease-out ${Math.random() * 1.2}s infinite`,
              ["--xx" as any]: `${(Math.random() - 0.5) * 800}px`,
            }}
          >
            <Visual idx={i} />
          </div>
        ))}
        <style>{`@keyframes fountain{0%{transform:translate(-50%,0) scale(0.4);opacity:1}100%{transform:translate(calc(-50% + var(--xx)),-90vh) scale(1.2);opacity:0}}`}</style>
      </>
    );
  }

  // wave
  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `-10%`,
            top: `${(i / count) * 100}%`,
            animation: `wave ${4 + Math.random() * 2}s linear ${Math.random() * 3}s infinite`,
          }}
        >
          <Visual idx={i} />
        </div>
      ))}
      <style>{`@keyframes wave{0%{transform:translateX(0) translateY(0)}50%{transform:translateX(60vw) translateY(-30px)}100%{transform:translateX(120vw) translateY(0)}}`}</style>
    </>
  );
}
