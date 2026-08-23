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
        <span className="mb-2 block font-jakarta text-lg font-semibold text-alphanom-navy">
          Who are you looking for?
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Paste a job description, or describe your ideal candidate — role, must-have skills, years of experience, and location."
          className="input-field h-36 resize-none leading-relaxed"
          disabled={loading}
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={onSearch}
          disabled={loading}
          className="btn-primary w-full sm:w-auto sm:flex-1"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Searching…
            </>
          ) : (
            <>Find candidates →</>
          )}
        </button>

        <span className="text-center text-xs text-alphanom-muted sm:text-left">
          or press{' '}
          <kbd className="rounded border border-alphanom-line bg-alphanom-bg px-1.5 py-0.5 font-mono text-[11px]">
            Ctrl
          </kbd>{' '}
          +{' '}
          <kbd className="rounded border border-alphanom-line bg-alphanom-bg px-1.5 py-0.5 font-mono text-[11px]">
            Enter
          </kbd>
        </span>
      </div>
    </div>
  );
}
