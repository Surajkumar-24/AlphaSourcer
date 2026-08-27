import { NextRequest, NextResponse } from 'next/server';
import { parseRequirement } from '@/lib/groq/parseRequirement';
import { buildClarifications } from '@/lib/search/clarify';
import { buildQueries } from '@/lib/search/buildQueries';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * Parses a requirement and reports what it understood, what is missing, and a
 * cleaner way to phrase it — so gaps are settled before a search spends its
 * time and quota on a vague brief.
 */
export async function POST(request: NextRequest) {
  try {
    const { requirement } = await request.json();

    if (!requirement || typeof requirement !== 'string' || !requirement.trim()) {
      return NextResponse.json({ error: 'Invalid requirement' }, { status: 400 });
    }

    const brief = await parseRequirement(requirement);
    const clarify = buildClarifications(brief);

    return NextResponse.json({
      ...clarify,
      previewQueries: buildQueries(brief)
        .slice(0, 5)
        .map((q) => q.query),
    });
  } catch (error) {
    console.error('Analyze error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Could not analyse requirement: ${message}` }, { status: 500 });
  }
}
