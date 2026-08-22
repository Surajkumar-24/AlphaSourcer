interface CandidateFiltersProps {
  filters: string[];
  onFiltersChange: (filters: string[]) => void;
  sortBy: 'relevance' | 'name';
  onSortChange: (sortBy: 'relevance' | 'name') => void;
  excellentCount: number;
  strongCount: number;
  potentialCount: number;
}

export default function CandidateFilters({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  excellentCount,
  strongCount,
  potentialCount,
}: CandidateFiltersProps) {
  const toggleFilter = (filter: string) => {
    if (filters.includes(filter)) {
      onFiltersChange(filters.filter((f) => f !== filter));
    } else {
      onFiltersChange([...filters, filter]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-jakarta font-semibold text-sm mb-3">Filter by Match Strength</h3>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.includes('excellent')}
              onChange={() => toggleFilter('excellent')}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">Excellent ({excellentCount})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.includes('strong')}
              onChange={() => toggleFilter('strong')}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">Strong ({strongCount})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.includes('potential')}
              onChange={() => toggleFilter('potential')}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">Potential ({potentialCount})</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-jakarta font-semibold text-sm mb-3">Sort By</h3>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={sortBy === 'relevance'}
              onChange={() => onSortChange('relevance')}
              className="w-4 h-4"
            />
            <span className="text-sm">Highest Relevance</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={sortBy === 'name'}
              onChange={() => onSortChange('name')}
              className="w-4 h-4"
            />
            <span className="text-sm">Candidate Name</span>
          </label>
        </div>
      </div>
    </div>
  );
}
