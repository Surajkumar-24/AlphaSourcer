import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-jakarta font-bold text-sm text-gray-500">AlphaNom</span>
            <span className="font-jakarta font-bold text-lg text-alphanom-navy">AlphaSourcer</span>
          </div>
        </Link>
        <div className="text-sm text-gray-600">AI-powered candidate sourcing</div>
      </div>
    </header>
  );
}
