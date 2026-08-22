import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'AlphaSourcer - AI Candidate Sourcing',
  description: 'AI-powered candidate sourcing by AlphaNom',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-inter bg-alphanom-bg text-alphanom-navy">{children}</body>
    </html>
  );
}
