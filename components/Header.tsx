import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-alphanom-line bg-white/85 backdrop-blur-md">
      <div className="container mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <Logo className="h-9 w-auto transition-transform group-hover:scale-105" title="AlphaNom" />
          <span className="flex flex-col leading-tight">
            <span className="section-label">AlphaNom</span>
            <span className="font-jakarta text-lg font-bold text-alphanom-navy">AlphaSourcer</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 rounded-pill border border-alphanom-line bg-alphanom-bg px-3.5 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alphanom-teal opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-alphanom-teal" />
          </span>
          <span className="hidden text-sm font-medium text-alphanom-muted sm:inline">
            AI-powered candidate sourcing
          </span>
        </div>
      </div>
    </header>
  );
}
