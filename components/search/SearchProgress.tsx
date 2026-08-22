import { SearchSession } from '@/types/index';

interface SearchProgressProps {
  session: SearchSession;
}

const STAGES = [
  { key: 'analyzing', label: 'Understanding your requirement' },
  { key: 'generating_queries', label: 'Building sourcing strategy' },
  { key: 'searching', label: 'Searching LinkedIn profiles' },
  { key: 'deduplicating', label: 'Removing duplicates' },
  { key: 'scoring', label: 'Evaluating candidate relevance' },
  { key: 'completed', label: 'Complete' },
];

export default function SearchProgress({ session }: SearchProgressProps) {
  const currentStageIndex = STAGES.findIndex((s) => s.key === session.status);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <h2 className="font-jakarta font-bold text-2xl mb-8 text-alphanom-navy">Sourcing in Progress...</h2>

        <div className="space-y-4">
          {STAGES.map((stage, index) => {
            const isCompleted = index <= currentStageIndex && session.status !== 'failed';
            const isCurrent = index === currentStageIndex && session.status !== 'completed';

            return (
              <div key={stage.key} className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-alphanom-teal flex items-center justify-center text-white">
                      ✓
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-alphanom-teal animate-pulse" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isCompleted ? 'text-gray-600' : isCurrent ? 'text-alphanom-navy' : 'text-gray-400'}`}>
                    {stage.label}
                  </p>
                  {stage.key === 'generating_queries' && session.generatedQueries.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">{session.generatedQueries.length} X-ray search strategies created</p>
                  )}
                  {stage.key === 'searching' && session.totalResultsFound > 0 && (
                    <p className="text-sm text-gray-500 mt-1">{session.totalResultsFound} profiles discovered</p>
                  )}
                  {stage.key === 'deduplicating' && session.uniqueCandidatesFound > 0 && (
                    <p className="text-sm text-gray-500 mt-1">{session.uniqueCandidatesFound} unique candidates identified</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-alphanom-bg rounded border border-gray-300">
          <p className="text-sm text-gray-600">
            <strong>Status:</strong> {session.status === 'scoring' ? 'Ranking candidates...' : session.status}
          </p>
        </div>
      </div>
    </div>
  );
}
