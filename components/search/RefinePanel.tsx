'use client';

import { useState } from 'react';

export interface ClarifyOption {
  label: string;
  value: string;
}

export interface ClarifyQuestion {
  id: string;
  question: string;
  why: string;
  options: ClarifyOption[];
  allowCustom: boolean;
}

export interface AnalyzeResult {
  questions: ClarifyQuestion[];
  suggestedPrompt: string;
  understood: string[];
  previewQueries: string[];
}

interface RefinePanelProps {
  analysis: AnalyzeResult;
  onSearch: (extraDetail: string) => void;
  onUseSuggested: (prompt: string) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function RefinePanel({
  analysis,
  onSearch,
  onUseSuggested,
  onCancel,
  loading,
}: RefinePanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const setAnswer = (id: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const handleSearch = () => {
    // Only answered questions become extra requirement text.
    const extra = analysis.questions
      .map((q) => answers[q.id])
      .filter((v) => v && v.trim())
      .join('. ');
    onSearch(extra);
  };

  const answeredCount = analysis.questions.filter((q) => answers[q.id]?.trim()).length;

  return (
    <div className="space-y-4">
      {/* What was understood */}
      <div className="card p-5 sm:p-6">
        <h3 className="section-label mb-3">What I understood</h3>
        {analysis.understood.length === 0 ? (
          <p className="text-sm text-alphanom-muted">
            Nothing concrete could be extracted — the questions below matter more than usual.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {analysis.understood.map((line) => {
              const [label, ...rest] = line.split(': ');
              return (
                <li key={line} className="flex gap-2 text-sm">
                  <span className="w-36 shrink-0 text-alphanom-muted">{label}</span>
                  <span className="font-medium text-alphanom-navy">{rest.join(': ')}</span>
                </li>
              );
            })}
          </ul>
        )}

        {analysis.previewQueries.length > 0 && (
          <details className="mt-4 border-t border-alphanom-line pt-3">
            <summary className="cursor-pointer text-sm font-medium text-alphanom-teal">
              Preview the searches this will run
            </summary>
            <ul className="mt-2 space-y-1">
              {analysis.previewQueries.map((q) => (
                <li key={q} className="break-words font-mono text-[11px] text-alphanom-navy/70">
                  {q}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Gaps */}
      {analysis.questions.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h3 className="font-jakarta text-lg font-bold text-alphanom-navy">
            A few details would sharpen this
          </h3>
          <p className="mt-1 text-sm text-alphanom-muted">
            Optional — skip anything that doesn&rsquo;t apply.
          </p>

          <div className="mt-5 space-y-5">
            {analysis.questions.map((q) => (
              <div key={q.id}>
                <label className="block font-jakarta text-sm font-semibold text-alphanom-navy">
                  {q.question}
                </label>
                <p className="mt-0.5 text-xs text-alphanom-muted">{q.why}</p>

                {q.options.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setAnswer(q.id, opt.value)}
                        className={`chip ${answers[q.id] === opt.value ? 'chip-on' : 'chip-off'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {q.allowCustom && (
                  <input
                    type="text"
                    value={
                      q.options.some((o) => o.value === answers[q.id]) ? '' : answers[q.id] ?? ''
                    }
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Or type your own…"
                    className="input-field mt-2 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested rewrite */}
      <div className="card p-5 sm:p-6">
        <h3 className="section-label mb-2">Suggested phrasing</h3>
        <p className="mb-3 text-xs text-alphanom-muted">
          This is the shape that searches best — explicit title, location, experience and
          background.
        </p>
        <pre className="whitespace-pre-wrap rounded-card bg-alphanom-bg p-3 font-mono text-xs leading-relaxed text-alphanom-navy/80">
          {analysis.suggestedPrompt}
        </pre>
        <button
          type="button"
          onClick={() => onUseSuggested(analysis.suggestedPrompt)}
          disabled={loading}
          className="btn-secondary mt-3 py-2 text-sm"
        >
          Use this wording
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={handleSearch} disabled={loading} className="btn-primary sm:flex-1">
          {loading
            ? 'Starting…'
            : answeredCount > 0
              ? `Search with ${answeredCount} added detail${answeredCount === 1 ? '' : 's'}`
              : 'Search as-is'}
        </button>
        <button onClick={onCancel} disabled={loading} className="btn-secondary">
          Back to editing
        </button>
      </div>
    </div>
  );
}
