/**
 * Small line icons used by the page-family templates (filters, meta rows,
 * category rails). One stroke weight, currentColor, decorative by default so
 * the visible label next to each one carries the meaning.
 */
type IconProps = { size?: number; className?: string };

function base({ size = 16, className = '' }: IconProps, children: React.ReactNode, viewBox = '0 0 20 20') {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(p: IconProps) {
  return base(p, <><circle cx="9" cy="9" r="6" /><path d="m13.5 13.5 3.5 3.5" /></>);
}
export function PinIcon(p: IconProps) {
  return base(p, <><path d="M10 2.5c-2.8 0-5 2.2-5 5 0 3.8 5 10 5 10s5-6.2 5-10c0-2.8-2.2-5-5-5Z" /><circle cx="10" cy="7.5" r="1.8" /></>);
}
export function ForkIcon(p: IconProps) {
  return base(p, <><path d="M6 2.5v15M4 2.5v4a2 2 0 0 0 4 0v-4M14 2.5c-1.7 0-3 2-3 5v3h3v7" /></>);
}
export function PeopleIcon(p: IconProps) {
  return base(p, <><circle cx="7.5" cy="7" r="2.6" /><circle cx="13.5" cy="8" r="2.1" /><path d="M2.5 16.5c0-2.8 2.2-5 5-5s5 2.2 5 5M12 12.2c2.6 0 4.5 1.9 4.5 4.3" /></>);
}
export function TagIcon(p: IconProps) {
  return base(p, <><path d="M2.5 9.5v-7h7l8 8-7 7-8-8Z" /><circle cx="6.5" cy="6.5" r="1.2" /></>);
}
export function CalendarIcon(p: IconProps) {
  return base(p, <><rect x="2.5" y="4" width="15" height="13.5" rx="1.2" /><path d="M2.5 8.5h15M6.5 2.5v3.5M13.5 2.5v3.5" /></>);
}
export function ClockIcon(p: IconProps) {
  return base(p, <><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 2" /></>);
}
export function BookmarkIcon({ filled = false, ...p }: IconProps & { filled?: boolean }) {
  return base(p, <path d="M5 2.5h10v15l-5-3.5-5 3.5v-15Z" fill={filled ? 'currentColor' : 'none'} />);
}
export function ArrowIcon(p: IconProps) {
  return base(p, <><path d="M3.5 10h13M11 4.5l5.5 5.5-5.5 5.5" /></>);
}
export function MusicIcon(p: IconProps) {
  return base(p, <><path d="M7.5 15.5V4l9-2v11.5" /><circle cx="5" cy="15.5" r="2.5" /><circle cx="14" cy="13.5" r="2.5" /></>);
}
export function WalkIcon(p: IconProps) {
  return base(p, <><circle cx="11" cy="3.5" r="1.6" /><path d="M8 18l2-6M12 18l-1.5-4.5L9 10l1-4 3 1.5 2 2.5M6 11l3-5" /></>);
}
export function BuildingIcon(p: IconProps) {
  return base(p, <><path d="M3 17.5h14M4.5 17.5v-9h11v9M2.5 8.5 10 3l7.5 5.5" /><path d="M7.5 17.5v-4h5v4" /></>);
}
export function WaterIcon(p: IconProps) {
  return base(p, <><path d="M2.5 12c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 3.5 1.5M2.5 16c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 3.5 1.5M6 8.5 10 3l4 5.5" /></>);
}
export function DollarIcon(p: IconProps) {
  return base(p, <><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5v9M12.5 7.8c0-1-1-1.6-2.5-1.6s-2.5.6-2.5 1.6c0 2.4 5 1.3 5 3.9 0 1-1 1.7-2.5 1.7s-2.5-.7-2.5-1.7" /></>);
}
export function BedIcon(p: IconProps) {
  return base(p, <><path d="M2.5 15.5V7M2.5 12h15v3.5M17.5 12V9.5a2 2 0 0 0-2-2H9v4.5" /><circle cx="5.5" cy="9.5" r="1.5" /></>);
}
export function TreeIcon(p: IconProps) {
  return base(p, <><path d="M10 17.5v-4M5 13.5h10L12.5 9.5h1.5L10 2.5 6 9.5h1.5L5 13.5Z" /></>);
}
export function KidsIcon(p: IconProps) {
  return base(p, <><circle cx="10" cy="5" r="2.2" /><path d="M6 17.5v-5a4 4 0 0 1 8 0v5M6 12.5H4M14 12.5h2" /></>);
}
export function StarIcon(p: IconProps) {
  return base(p, <path d="m10 2.5 2.3 4.8 5.2.7-3.8 3.6.9 5.2L10 14.3l-4.6 2.5.9-5.2-3.8-3.6 5.2-.7L10 2.5Z" />);
}
export function UmbrellaIcon(p: IconProps) {
  return base(p, <><path d="M2.5 10.5a7.5 7.5 0 0 1 15 0H2.5ZM10 10.5v5.5a1.5 1.5 0 0 0 3 0M10 2.5v1" /></>);
}
export function PaletteIcon(p: IconProps) {
  return base(p, <><path d="M10 2.5a7.5 7.5 0 1 0 0 15c1.2 0 1.5-.8 1.2-1.6-.5-1.2.3-2.4 1.6-2.4h1.4a3.3 3.3 0 0 0 3.3-3.3c0-4.3-3.5-7.7-7.5-7.7Z" /><circle cx="6.5" cy="9" r="1" /><circle cx="9.5" cy="6" r="1" /><circle cx="13.5" cy="7" r="1" /></>);
}
export function TicketIcon(p: IconProps) {
  return base(p, <><path d="M2.5 7.5v-3h15v3a2 2 0 0 0 0 4v4h-15v-4a2 2 0 0 0 0-4Z" /><path d="M8 4.5v11" strokeDasharray="1.5 2" /></>);
}
export function WifiIcon(p: IconProps) {
  return base(p, <><path d="M2.5 8a11 11 0 0 1 15 0M5 11a7.5 7.5 0 0 1 10 0M7.5 14a4 4 0 0 1 5 0" /><circle cx="10" cy="16.5" r=".8" fill="currentColor" /></>);
}
export function PoolIcon(p: IconProps) {
  return base(p, <><path d="M7 14V4.5a2 2 0 0 1 4 0M13 14V4.5a2 2 0 0 1 4 0M7 8h6M7 11.5h6" /><path d="M2.5 16c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 3.5 1.5" /></>);
}
export function GlassIcon(p: IconProps) {
  return base(p, <><path d="M5 2.5h10l-1 7a4 4 0 0 1-8 0l-1-7ZM10 13.5v4M7 17.5h6M5.5 6h9" /></>);
}
export function CheckIcon(p: IconProps) {
  return base(p, <path d="m4 10.5 4 4 8-9" />);
}
export function BriefcaseIcon(p: IconProps) {
  return base(p, <><rect x="2.5" y="6" width="15" height="11" rx="1.2" /><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6M2.5 10.5h15" /></>);
}
export function HeartIcon(p: IconProps) {
  return base(p, <path d="M10 17s-7-4.4-7-9.3A3.7 3.7 0 0 1 10 5.9a3.7 3.7 0 0 1 7 1.8C17 12.6 10 17 10 17Z" />);
}
export function RingIcon(p: IconProps) {
  return base(p, <><circle cx="10" cy="12" r="5.5" /><path d="m7.5 4 2.5-1.5L12.5 4 10 7 7.5 4Z" /></>);
}
export function BottleIcon(p: IconProps) {
  return base(p, <><path d="M8 2.5h4v3l1.5 2.5v9a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V8L8 5.5v-3Z" /><path d="M6.5 11h7" /></>);
}
export function SparkleIcon(p: IconProps) {
  return base(p, <><path d="M10 2.5 11.8 8.2 17.5 10l-5.7 1.8L10 17.5l-1.8-5.7L2.5 10l5.7-1.8L10 2.5Z" /></>);
}
export function BagIcon(p: IconProps) {
  return base(p, <><path d="M4 7h12l-1 10.5H5L4 7Z" /><path d="M7.5 8.5V6a2.5 2.5 0 0 1 5 0v2.5" /></>);
}
