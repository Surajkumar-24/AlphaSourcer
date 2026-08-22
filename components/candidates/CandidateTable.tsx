import { useState } from 'react';
import { Candidate } from '@/types/index';
import { getMatchStrengthColor, truncate } from '@/lib/utils';

interface CandidateTableProps {
  candidates: Candidate[];
  selectedIds: Set<string>;
  onToggleCandidate: (id: string) => void;
  onToggleByStrength: (strength: string) => void;
}

export default function CandidateTable({
  candidates,
  selectedIds,
  onToggleCandidate,
  onToggleByStrength,
}: CandidateTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-jakarta font-semibold w-10"></th>
            <th className="text-left py-3 px-4 font-jakarta font-semibold">Rank</th>
            <th className="text-left py-3 px-4 font-jakarta font-semibold">Candidate</th>
            <th className="text-left py-3 px-4 font-jakarta font-semibold">Designation</th>
            <th className="text-left py-3 px-4 font-jakarta font-semibold">Organization</th>
            <th className="text-left py-3 px-4 font-jakarta font-semibold">Match</th>
            <th className="text-left py-3 px-4 font-jakarta font-semibold">Profile</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate, index) => (
            <tbody key={candidate.id}>
              <tr className="border-b border-gray-100 hover:bg-alphanom-bg transition-colors">
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(candidate.id)}
                    onChange={() => onToggleCandidate(candidate.id)}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                  />
                </td>
                <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => setExpandedId(expandedId === candidate.id ? null : candidate.id)}
                    className="text-alphanom-navy hover:text-alphanom-teal font-medium text-left"
                  >
                    {candidate.name}
                  </button>
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {truncate(candidate.currentDesignation || '-', 30)}
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {truncate(candidate.currentOrganization || '-', 20)}
                </td>
                <td className="py-3 px-4">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getMatchStrengthColor(candidate.matchStrength)}`}>
                    {candidate.finalScore.toFixed(0)}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-alphanom-teal hover:text-blue-700 font-medium text-sm"
                  >
                    View
                  </a>
                </td>
              </tr>

              {expandedId === candidate.id && (
                <tr className="bg-alphanom-bg border-b border-gray-200">
                  <td colSpan={7} className="py-4 px-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-jakarta font-semibold text-alphanom-navy mb-2">Match Analysis</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>{candidate.finalScore.toFixed(0)}% Match</strong>
                        </p>
                        <p className="text-sm text-gray-600">{candidate.reasoningSummary}</p>
                      </div>

                      {candidate.confirmedMatches.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm text-green-700 mb-2">✓ Confirmed Matches</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {candidate.confirmedMatches.map((match, i) => (
                              <li key={i}>• {match}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {candidate.uncertainRequirements.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm text-yellow-700 mb-2">? Uncertain</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {candidate.uncertainRequirements.map((req, i) => (
                              <li key={i}>• {req}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {candidate.mismatchFlags.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm text-red-700 mb-2">⚠ Concerns</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {candidate.mismatchFlags.map((flag, i) => (
                              <li key={i}>• {flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </tbody>
      </table>
    </div>
  );
}
