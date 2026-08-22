import { useState } from 'react';

interface AdvancedFiltersProps {
  filters: any;
  onChange: (filters: any) => void;
}

export default function AdvancedFilters({ filters, onChange }: AdvancedFiltersProps) {
  const [nonNegotiables, setNonNegotiables] = useState<string[]>(['', '', '']);

  const updateNonNegotiable = (index: number, value: string) => {
    const updated = [...nonNegotiables];
    updated[index] = value;
    setNonNegotiables(updated);
    onChange({ ...filters, nonNegotiables: updated.filter((n) => n.trim()) });
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-jakarta font-semibold text-sm mb-2">Alternative Titles</label>
          <input
            type="text"
            placeholder="Separate with commas"
            className="input-field"
            onChange={(e) => onChange({
              ...filters,
              alternativeTitles: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
            })}
          />
        </div>

        <div>
          <label className="block font-jakarta font-semibold text-sm mb-2">Experience Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              className="input-field w-1/2"
              onChange={(e) => onChange({ ...filters, minExperience: parseInt(e.target.value) || null })}
            />
            <input
              type="number"
              placeholder="Max"
              className="input-field w-1/2"
              onChange={(e) => onChange({ ...filters, maxExperience: parseInt(e.target.value) || null })}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-jakarta font-semibold text-sm mb-2">Must-Have Skills</label>
          <input
            type="text"
            placeholder="Separate with commas"
            className="input-field"
            onChange={(e) => onChange({
              ...filters,
              mustHaveSkills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })}
          />
        </div>

        <div>
          <label className="block font-jakarta font-semibold text-sm mb-2">Good-to-Have Skills</label>
          <input
            type="text"
            placeholder="Separate with commas"
            className="input-field"
            onChange={(e) => onChange({
              ...filters,
              goodToHaveSkills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-jakarta font-semibold text-sm mb-2">Preferred Locations</label>
          <input
            type="text"
            placeholder="Separate with commas"
            className="input-field"
            onChange={(e) => onChange({
              ...filters,
              locations: e.target.value.split(',').map((l) => l.trim()).filter(Boolean),
            })}
          />
        </div>

        <div>
          <label className="block font-jakarta font-semibold text-sm mb-2">Preferred Companies</label>
          <input
            type="text"
            placeholder="Separate with commas"
            className="input-field"
            onChange={(e) => onChange({
              ...filters,
              preferredCompanies: e.target.value.split(',').map((c) => c.trim()).filter(Boolean),
            })}
          />
        </div>
      </div>

      <div>
        <label className="block font-jakarta font-semibold text-sm mb-3">Three Non-Negotiables (Most Important)</label>
        <div className="space-y-2">
          {nonNegotiables.map((value, index) => (
            <input
              key={index}
              type="text"
              placeholder={`Requirement ${index + 1}`}
              value={value}
              onChange={(e) => updateNonNegotiable(index, e.target.value)}
              className="input-field"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
