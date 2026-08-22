'use client';

import { useState } from 'react';
import { SearchSession, Candidate } from '@/types/index';
import CandidateTable from './CandidateTable';
import CandidateFilters from './CandidateFilters';
import ExportButton from './ExportButton';

export default function CandidateResults({ session }: { session: SearchSession }) {
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<string[]>(['excellent', 'strong']);
  const [sortBy, setSortBy] = useState<'relevance' | 'name'>('relevance');

  const excellentMatches = session.candidates.filter((c) => c.matchStrength === 'excellent').length;
  const strongMatches = session.candidates.filter((c) => c.matchStrength === 'strong').length;
  const potentialMatches = session.candidates.filter((c) => c.matchStrength === 'potential').length;

  const filteredCandidates = session.candidates.filter((c) => filters.includes(c.matchStrength));

  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    if (sortBy === 'relevance') {
      return b.finalScore - a.finalScore;
    }
    return a.name.localeCompare(b.name);
  });

  const toggleCandidate = (id: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCandidates(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedCandidates.size === sortedCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(sortedCandidates.map((c) => c.id)));
    }
  };

  const toggleSelectByStrength = (strength: string) => {
    const candidatesOfStrength = sortedCandidates.filter((c) => c.matchStrength === strength);
    const newSelected = new Set(selectedCandidates);
    const allSelected = candidatesOfStrength.every((c) => newSelected.has(c.id));

    if (allSelected) {
      candidatesOfStrength.forEach((c) => newSelected.delete(c.id));
    } else {
      candidatesOfStrength.forEach((c) => newSelected.add(c.id));
    }

    setSelectedCandidates(newSelected);
  };

  const selectedCandidatesList = sortedCandidates.filter((c) => selectedCandidates.has(c.id));

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-jakarta font-bold text-2xl text-alphanom-navy">
              {session.uniqueCandidatesFound} Unique Candidates Found
            </h2>
            <div className="flex gap-6 mt-2 text-sm">
              <span className="text-green-600 font-medium">{excellentMatches} Excellent</span>
              <span className="text-blue-600 font-medium">{strongMatches} Strong</span>
              <span className="text-yellow-600 font-medium">{potentialMatches} Potential</span>
            </div>
          </div>
          <ExportButton candidates={selectedCandidatesList} roleName={session.searchBrief?.primaryTitle || 'Candidates'} />
        </div>
      </div>

      <div className="card p-6">
        <CandidateFilters
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          excellentCount={excellentMatches}
          strongCount={strongMatches}
          potentialCount={potentialMatches}
        />
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedCandidates.size === sortedCandidates.length && sortedCandidates.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">Select All</span>
          </label>

          <span className="text-sm text-gray-600 ml-auto">
            {selectedCandidates.size} of {sortedCandidates.length} selected
          </span>
        </div>

        {sortedCandidates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No candidates match the selected filters.</p>
          </div>
        ) : (
          <CandidateTable
            candidates={sortedCandidates}
            selectedIds={selectedCandidates}
            onToggleCandidate={toggleCandidate}
            onToggleByStrength={toggleSelectByStrength}
          />
        )}
      </div>
    </div>
  );
}
