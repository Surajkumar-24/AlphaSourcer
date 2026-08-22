'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import RequirementInput from '@/components/search/RequirementInput';
import AdvancedFilters from '@/components/search/AdvancedFilters';

export default function Home() {
  const router = useRouter();
  const [requirement, setRequirement] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!requirement.trim()) {
      setError('Please enter a hiring requirement');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement, advancedFilters }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      router.push(`/search/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-alphanom-bg">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-jakarta font-bold text-alphanom-navy mb-4">
            Find the right candidates. Let AI handle the sourcing.
          </h1>
          <p className="text-lg text-gray-600">
            Describe who you're looking for. AlphaSourcer will build the search strategy, run intelligent X-ray searches, and rank the most relevant candidates.
          </p>
        </div>

        <div className="card p-8 mb-6">
          <RequirementInput
            value={requirement}
            onChange={setRequirement}
            onKeyPress={handleKeyPress}
            loading={loading}
            onSearch={handleSearch}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-card p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        <div className="card p-6">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="text-alphanom-teal hover:text-blue-700 font-medium flex items-center gap-2"
          >
            {advancedOpen ? '−' : '+'} Add more requirements
          </button>

          {advancedOpen && (
            <AdvancedFilters
              filters={advancedFilters}
              onChange={setAdvancedFilters}
            />
          )}
        </div>

        <div className="mt-12 p-6 bg-white rounded-card border border-gray-200">
          <h3 className="font-jakarta font-bold text-lg mb-4">Example Requirement</h3>
          <p className="text-gray-600 font-mono text-sm bg-gray-50 p-4 rounded">
            Looking for a Senior Backend Engineer with 4–7 years of experience in Python, Django, AWS and
            microservices. Candidates should preferably have product startup experience. Location: Bangalore.
          </p>
        </div>
      </main>
    </div>
  );
}
