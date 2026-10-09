import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export const IconSpeaker = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" fill="currentColor" stroke="none" />
    <path d="M15.6 9a4.4 4.4 0 0 1 0 6" />
    <path d="M18.4 6.4a8 8 0 0 1 0 11.2" />
  </svg>
);

export const IconStar = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path
      d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.6 6.7 19.4l1.1-5.9L3.5 9.4l5.9-.8z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export const IconCheck = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.5 12.8l4.6 4.6L19.5 6.8" />
  </svg>
);

export const IconClose = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconArrowRight = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.5 12h14M13 6.2l5.8 5.8-5.8 5.8" />
  </svg>
);

export const IconArrowLeft = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M19.5 12h-14M11 6.2L5.2 12l5.8 5.8" />
  </svg>
);

export const IconMic = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="2.8" width="6" height="11" rx="3" />
    <path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8V21" />
  </svg>
);

export const IconHome = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3.6 10.8L12 3.6l8.4 7.2v9a1 1 0 0 1-1 1h-4.2v-6H8.8v6H4.6a1 1 0 0 1-1-1z" />
  </svg>
);

export const IconGrid = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3.4" y="3.4" width="7" height="7" rx="2.2" />
    <rect x="13.6" y="3.4" width="7" height="7" rx="2.2" />
    <rect x="3.4" y="13.6" width="7" height="7" rx="2.2" />
    <rect x="13.6" y="13.6" width="7" height="7" rx="2.2" />
  </svg>
);

export const IconEye = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M2.4 12S6 5.6 12 5.6 21.6 12 21.6 12 18 18.4 12 18.4 2.4 12 2.4 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

export const IconEyeOff = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 4l16 16" />
    <path d="M9.6 6.2A9.7 9.7 0 0 1 12 5.9c6 0 9.6 6.1 9.6 6.1a17 17 0 0 1-3.2 3.9M6.5 8.2A16.7 16.7 0 0 0 2.4 12S6 18.1 12 18.1a9.6 9.6 0 0 0 3.3-.6" />
  </svg>
);

export const IconShuffle = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3.4 6.6h3.4c1.6 0 2.6.8 3.6 2.2l3.2 4.8c1 1.4 2 2.2 3.6 2.2h3.4" />
    <path d="M3.4 17.4h3.4c1.6 0 2.6-.8 3.6-2.2M14.6 8.4c1-1.3 2-2 3.6-2h3.4" />
    <path d="M18.6 3.4l3 3.2-3 3.2M18.6 12.6l3 3.2-3 3.2" />
  </svg>
);

export const IconSave = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.6 4.6h11.2L19.4 8v11.4H4.6z" />
    <path d="M8.2 4.6v4.6h6.4V4.6M8.2 19.4v-5h7.6v5" />
  </svg>
);

export const IconTrash = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.8 7h14.4M9.4 7V4.8h5.2V7M6.6 7l1 12.2h8.8L17.4 7" />
  </svg>
);

export const IconPlus = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconSparkle = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.4l1.7 4.9 4.9 1.7-4.9 1.7L12 16.6l-1.7-4.9L5.4 10l4.9-1.7z" fill="currentColor" stroke="none" />
    <path d="M18.6 15.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconPlay = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7.4 4.8l12 7.2-12 7.2z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconPause = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="6.4" y="5" width="4" height="14" rx="1.6" fill="currentColor" stroke="none" />
    <rect x="13.6" y="5" width="4" height="14" rx="1.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChevron = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M8.4 5.4L15 12l-6.6 6.6" />
  </svg>
);

export const IconMaximize = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const TutorlyMark = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    <circle cx="24" cy="24" r="22" fill="#F2836B" />
    <circle cx="24" cy="24" r="22" fill="url(#tg)" fillOpacity="0.35" />
    <defs>
      <linearGradient id="tg" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0" stopColor="#F5C453" />
        <stop offset="1" stopColor="#B394D6" />
      </linearGradient>
    </defs>
    <path
      d="M14 17.5c0-2.5 4.5-4.5 10-4.5s10 2 10 4.5c0 1.6-1.8 3-4.6 3.8-.6.2-1 .7-1 1.3v5.6c0 2.9-1.9 4.6-4.4 4.6s-4.4-1.7-4.4-4.6c0-1.9 1-3.3 2.4-3.9.5-.2.8-.7.8-1.2 0-.7-.5-1.2-1.2-1.2-2.9 0-7.6-1.7-7.6-4.4z"
      fill="#FFF6EA"
    />
    <circle cx="33.5" cy="31.5" r="3.4" fill="#8FBE9B" />
  </svg>
);
