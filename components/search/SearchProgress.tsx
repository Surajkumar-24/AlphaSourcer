'use client';

import { useEffect, useRef, useState } from 'react';
import { SearchSession } from '@/types/index';
import Logo from '@/components/Logo';

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

const TIPS = [
  'Each search angle targets a different slice of the market — exact titles, adjacent roles, and skill-led discovery.',
  'Candidates found by more than one angle tend to rank higher: independent signals corroborate each other.',
  'Scores combine measurable profile signals with an AI reading of the evidence — never a guess about missing data.',
  'Missing information is never treated as a mismatch. A blank field lowers certainty, not the candidate.',
  'Adding a location or a couple of must-have skills sharpens ranking far more than a longer description.',
  'Every candidate links straight to their LinkedIn profile, and your selection exports to Excel in one click.',
];

const FAMILY_LABELS: Record<string, string> = {
  precision: 'Precision',
  alternative_title: 'Alt. titles',
  skill_led: 'Skill-led',
  adjacent_role: 'Adjacent',
  company_led: 'Company',
  recall_expansion: 'Recall',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Eases a number toward its target so counters climb instead of jumping. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(target);
  const raf = useRef<number>();

  useEffect(() => {
    const step = () => {
      setValue((current) => {
        if (current === target) return current;
        const delta = target - current;
        const next = current + Math.sign(delta) * Math.max(1, Math.ceil(Math.abs(delta) / 8));
        return delta > 0 ? Math.min(next, target) : Math.max(next, target);
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target]);

  return value;
}

function Stat({ label, value }: { label: string; value: number }) {
  const shown = useCountUp(value);
  return (
    <div className="rounded-card border border-alphanom-line bg-white px-4 py-3">
      <p className="font-jakarta text-2xl font-bold tabular-nums text-alphanom-navy">{shown}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-alphanom-muted">
        {label}
      </p>
    </div>
  );
}

export default function SearchProgress({ session }: SearchProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const started = new Date(session.createdAt).getTime();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [session.createdAt]);

  useEffect(() => {
    const rotate = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 6500);
    return () => clearInterval(rotate);
  }, []);

  const stageIndex = STAGES.findIndex((s) => s.key === session.status);
  const pct = Math.max(6, Math.round(((stageIndex + 1) / STAGES.length) * 100));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const preview = session.candidates.slice(0, 5);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="overflow-hidden rounded-card bg-brand-gradient shadow-lift">
        <div className="flex flex-col items-center gap-5 px-6 py-9 text-center sm:px-8">
          <div className="animate-float-soft rounded-card bg-white px-7 py-5 shadow-lift">
            <Logo className="h-14 w-auto" animated />
          </div>

          <div>
            <h2 className="font-jakarta text-2xl font-bold text-white sm:text-3xl">
              Sourcing in progress
            </h2>
            <p className="mt-1.5 text-sm text-white/70">
              {STAGES[stageIndex]?.label ?? 'Getting started'}
            </p>
          </div>

          <div className="w-full max-w-md">
            <div className="h-1.5 overflow-hidden rounded-pill bg-white/15">
              <div
                className="h-full rounded-pill bg-alphanom-teal transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-white/55">
              <span>{pct}% complete</span>
              <span className="font-mono tabular-nums">
                {mm}:{ss} elapsed
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Search angles" value={session.generatedQueries.length} />
        <Stat label="Profiles found" value={session.totalResultsFound} />
        <Stat label="Ranked" value={session.candidates.length} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h3 className="section-label mb-3">Pipeline</h3>
          <ol className="space-y-2.5">
            {STAGES.map((stage, index) => {
              const done = index < stageIndex;
              const current = index === stageIndex && session.status !== 'completed';
              return (
                <li key={stage.key} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                      done
                        ? 'bg-alphanom-teal text-white'
                        : current
                          ? 'bg-alphanom-teal/15 text-alphanom-teal ring-2 ring-alphanom-teal'
                          : 'bg-alphanom-bg text-alphanom-muted'
                    }`}
                  >
                    {done ? '✓' : index + 1}
                  </span>
                  <span
                    className={`text-sm ${
                      current
                        ? 'font-jakarta font-semibold text-alphanom-navy'
                        : done
                          ? 'text-alphanom-muted'
                          : 'text-alphanom-muted/55'
                    }`}
                  >
                    {stage.label}
                  </span>
                  {current && (
                    <span className="ml-auto flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-alphanom-teal"
                          style={{ animationDelay: `${d * 140}ms` }}
                        />
                      ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="section-label mb-3">Search strategies being run</h3>

          {session.generatedQueries.length === 0 ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="shimmer relative h-8 overflow-hidden rounded-card bg-alphanom-bg"
                />
              ))}
            </div>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {session.generatedQueries.map((query, i) => (
                <li
                  key={query.id}
                  className="animate-rise-in rounded-card border border-alphanom-line bg-alphanom-bg/60 px-3 py-2"
                  style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
                >
                  <span className="badge bg-white text-alphanom-muted ring-1 ring-alphanom-line">
                    {FAMILY_LABELS[query.family] ?? query.family}
                  </span>
                  <code className="mt-1.5 block break-words font-mono text-[11px] leading-relaxed text-alphanom-navy/75">
                    {query.query}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h3 className="section-label mb-3">First matches coming through</h3>
          <ul className="space-y-2">
            {preview.map((candidate) => (
              <li
                key={candidate.id}
                className="animate-rise-in flex items-center gap-3 rounded-card border border-alphanom-line px-3 py-2"
              >
                <span className="avatar">{initials(candidate.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-jakarta text-sm font-semibold text-alphanom-navy">
                    {candidate.name}
                  </span>
                  <span className="block truncate text-xs text-alphanom-muted">
                    {candidate.currentDesignation || 'Designation not listed'}
                  </span>
                </span>
                <span className="font-jakarta text-sm font-bold tabular-nums text-alphanom-teal">
                  {Math.round(candidate.finalScore)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-card border border-alphanom-line bg-white px-5 py-4">
        <p className="section-label mb-1.5">While you wait</p>
        <p key={tipIndex} className="animate-rise-in text-sm leading-relaxed text-alphanom-navy/80">
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
}
