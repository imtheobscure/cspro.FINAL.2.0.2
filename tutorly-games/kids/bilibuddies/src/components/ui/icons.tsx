type P = { size?: number; className?: string; strokeWidth?: number };

const base = (size = 24, className = "", strokeWidth = 2.2) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

export const SpeakerIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const StarIcon = ({ size, className }: P) => (
  <svg {...base(size, className, 0)} fill="currentColor" stroke="none">
    <path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
  </svg>
);

export const CheckIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const XIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const LeftIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const RightIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const ShuffleIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M17 3l4 4-4 4" />
    <path d="M3 7h6l8 10h4" />
    <path d="M17 17l4-4" />
    <path d="M3 17h6l2-2.5" />
    <path d="M14 9.5 15 8h6" />
  </svg>
);

export const MicIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21M9 21h6" />
  </svg>
);

export const HandIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M14 11V6.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 3 14.5V12a1.5 1.5 0 0 1 3 0v1" />
  </svg>
);

export const PlayIcon = ({ size, className }: P) => (
  <svg {...base(size, className, 0)} fill="currentColor" stroke="none">
    <path d="M7 4.5 19 12 7 19.5z" />
  </svg>
);

export const PauseIcon = ({ size, className }: P) => (
  <svg {...base(size, className, 0)} fill="currentColor" stroke="none">
    <rect x="6" y="4.5" width="4" height="15" rx="1.6" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.6" />
  </svg>
);

export const RepeatIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M4 9a5 5 0 0 1 5-5h9" />
    <path d="m15 1 3 3-3 3" />
    <path d="M20 15a5 5 0 0 1-5 5H6" />
    <path d="m9 23-3-3 3-3" />
  </svg>
);

export const TrophyIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
    <path d="M12 14v4M8.5 21h7" />
  </svg>
);

export const GridIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
  </svg>
);

export const EyeIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const HomeIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M3.5 10.5 12 3.5l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
);

export const ClapIcon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M9 12 5.5 8.5a1.6 1.6 0 0 1 2.3-2.3L11 9.4" />
    <path d="M11.5 9.2 8.4 6.1a1.6 1.6 0 0 1 2.3-2.3l6.6 6.6" />
    <path d="M14 8.5a1.6 1.6 0 0 1 2.3-2.3l3 3A7 7 0 0 1 21 14c0 4-3 7-6.6 7S9 18.6 9 15.4" />
  </svg>
);
