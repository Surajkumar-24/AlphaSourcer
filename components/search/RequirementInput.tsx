interface RequirementInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  loading: boolean;
  onSearch: () => void;
}

export default function RequirementInput({
  value,
  onChange,
  onKeyPress,
  loading,
  onSearch,
}: RequirementInputProps) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="font-jakarta font-semibold text-lg text-alphanom-navy mb-2 block">
          Who are you looking for?
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Paste a job description or describe your ideal candidate.

Example:
Looking for a Senior Backend Engineer with 4–7 years of experience in Python, Django, AWS and microservices. Candidates should preferably have product startup experience. Location: Bangalore."
          className="input-field h-32 font-inter resize-none"
          disabled={loading}
        />
      </label>

      <button
        onClick={onSearch}
        disabled={loading}
        className="btn-primary w-full font-jakarta font-semibold"
      >
        {loading ? 'Searching...' : 'Find Candidates'}
      </button>

      <p className="text-sm text-gray-500 text-center">
        Tip: Press Ctrl+Enter to search
      </p>
    </div>
  );
}
