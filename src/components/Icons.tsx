import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h5v-6h4v6h5V10" /></Svg>
);
export const IconSparkles = (p: IconProps) => (
  <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></Svg>
);
export const IconPencil = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4L20 8l-4-4L4 16v4z" /><path d="M14 6l4 4" /></Svg>
);
export const IconFolder = (p: IconProps) => (
  <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></Svg>
);
export const IconGrid = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Svg>
);
export const IconStack = (p: IconProps) => (
  <Svg {...p}><path d="M12 3 3 7l9 4 9-4-9-4z" /><path d="M3 12l9 4 9-4" /><path d="M3 17l9 4 9-4" /></Svg>
);
export const IconHash = (p: IconProps) => (
  <Svg {...p}><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" /></Svg>
);
export const IconMail = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Svg>
);
export const IconDocument = (p: IconProps) => (
  <Svg {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></Svg>
);
export const IconBoard = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9M15 21V9" /></Svg>
);
export const IconTrendingUp = (p: IconProps) => (
  <Svg {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></Svg>
);
export const IconVideo = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3v-4z" /></Svg>
);
export const IconImage = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m3 17 5-5 5 5 3-3 5 5" /></Svg>
);
export const IconSearch = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
);
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
);
export const IconBell = (p: IconProps) => (
  <Svg {...p}><path d="M6 19V10a6 6 0 0 1 12 0v9" /><path d="M4 19h16M10 22a2 2 0 0 0 4 0" /></Svg>
);
export const IconSun = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4" /></Svg>
);
export const IconMoon = (p: IconProps) => (
  <Svg {...p}><path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z" /></Svg>
);
export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14M13 5l7 7-7 7" /></Svg>
);
