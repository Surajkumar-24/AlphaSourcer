interface CandidateFiltersProps {
  filters: string[];
  onFiltersChange: (filters: string[]) => void;
  sortBy: 'relevance' | 'name';
  onSortChange: (sortBy: 'relevance' | 'name') => void;
  excellentCount: number;
  strongCount: number;
  potentialCount: number;
  lowCount: number;
}

const DOT_STYLES: Record<string, string> = {
  excellent: 'bg-emerald-500',
  strong: 'bg-alphanom-teal',
  potential: 'bg-amber-400',
  low: 'bg-slate-300',
};

export default function CandidateFilters({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  excellentCount,
  strongCount,
  potentialCount,
  lowCount,
}: CandidateFiltersProps) {
  const toggleFilter = (filter: string) => {
    onFiltersChange(
      filters.includes(filter) ? filters.filter((f) => f !== filter) : [...filters, filter]
    );
  };

  const tiers = [
    { key: 'excellent', label: 'Excellent', count: excellentCount },
    { key: 'strong', label: 'Strong', count: strongCount },
    { key: 'potential', label: 'Potential', count: potentialCount },
    { key: 'low', label: 'Low', count: lowCount },
  ];

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h3 className="section-label mb-2.5">Filter by match strength</h3>
        <div className="flex flex-wrap gap-2">
          {tiers.map((tier) => {
            const active = filters.includes(tier.key);
            return (
              <button
                key={tier.key}
                type="button"
                onClick={() => toggleFilter(tier.key)}
                aria-pressed={active}
                className={`chip ${active ? 'chip-on' : 'chip-off'}`}
              >
                <span className={`h-2 w-2 rounded-full ${DOT_STYLES[tier.key]}`} />
                {tier.label}
                <span
                  className={`rounded-pill px-1.5 py-0.5 text-xs tabular-nums ${
                    active ? 'bg-white/15 text-white' : 'bg-alphanom-bg text-alphanom-muted'
                  }`}
                >
                  {tier.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="section-label mb-2.5">Sort by</h3>
        <div className="inline-flex rounded-pill border border-alphanom-line bg-white p-1">
          {(
            [
              { key: 'relevance', label: 'Relevance' },
              { key: 'name', label: 'Name' },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onSortChange(option.key)}
              aria-pressed={sortBy === option.key}
              className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
                sortBy === option.key
                  ? 'bg-alphanom-navy text-white shadow-sm'
                  : 'text-alphanom-muted hover:text-alphanom-navy'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
