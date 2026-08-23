/**
 * The official AlphaNom mark.
 *
 * Swap the file at `public/alphanom-logo.png` to update it everywhere.
 * If you have the vector original, save it as `alphanom-logo.svg` and change
 * LOGO_SRC below — SVG stays crisp at every size.
 */
const LOGO_SRC = '/alphanom-logo.png';

interface LogoProps {
  className?: string;
  /** Gentle motion while a search runs. */
  animated?: boolean;
  title?: string;
}

export default function Logo({ className = 'h-9 w-auto', animated = false, title }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt={title ?? 'AlphaNom'}
      className={`${className} ${animated ? 'animate-logo-pulse' : ''}`}
      draggable={false}
    />
  );
}
