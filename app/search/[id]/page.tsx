'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import SearchProgress from '@/components/search/SearchProgress';
import CandidateResults from '@/components/candidates/CandidateResults';
import { SearchSession } from '@/types/index';

export default function SearchPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<SearchSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const pollSearch = async () => {
      try {
        const response = await fetch(`/api/search?sessionId=${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch search');
        }

        const data: SearchSession = await response.json();
        setSession(data);

        if (data.status !== 'completed' && data.status !== 'failed') {
          setTimeout(pollSearch, 1000);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching search');
        setLoading(false);
      }
    };

    pollSearch();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-alphanom-bg">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {loading && session && session.status !== 'completed' && session.status !== 'failed' ? (
          <SearchProgress session={session} />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-card p-6 text-red-800">
            {error}
          </div>
        ) : session?.status === 'failed' ? (
          <div className="bg-red-50 border border-red-200 rounded-card p-6 text-red-800">
            <h3 className="font-jakarta font-bold mb-2">Search Failed</h3>
            <p>{session.error || 'An unknown error occurred'}</p>
          </div>
        ) : session ? (
          <CandidateResults session={session} />
        ) : null}
      </main>
    </div>
  );
}
