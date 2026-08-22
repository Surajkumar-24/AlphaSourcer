'use client';

import { useState } from 'react';
import { Candidate } from '@/types/index';

interface ExportButtonProps {
  candidates: Candidate[];
  roleName: string;
}

export default function ExportButton({ candidates, roleName }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (candidates.length === 0) {
      setError('Please select candidates to export');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates, roleName }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AlphaSourcer_${roleName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={loading || candidates.length === 0}
        className={`btn-primary font-jakarta font-semibold ${candidates.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Exporting...' : `Export (${candidates.length})`}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
