import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { SearchSession } from '@/types/index';
import { nanoid } from '@/lib/utils';
import { processSearchPipeline } from '@/lib/search/pipeline';
import { createSessionStore } from '@/lib/session-store';

// The pipeline runs after the response is sent, so the function must stay
// alive well past the default limit. 60s is the Hobby ceiling; Pro allows 300.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirement, advancedFilters } = body;

    if (!requirement || typeof requirement !== 'string') {
      return NextResponse.json({ error: 'Invalid requirement' }, { status: 400 });
    }

    if (requirement.length > 5000) {
      return NextResponse.json({ error: 'Requirement too long' }, { status: 400 });
    }

    const sessionStore = createSessionStore();
    const sessionId = nanoid();
    const session: SearchSession = {
      id: sessionId,
      status: 'created',
      rawRequirement: requirement,
      searchBrief: null,
      generatedQueries: [],
      totalResultsFound: 0,
      uniqueCandidatesFound: 0,
      candidates: [],
      createdAt: new Date().toISOString(),
    };

    await sessionStore.set(sessionId, session);

    // waitUntil keeps the serverless function running after the response is
    // returned; without it the pipeline would be frozen mid-flight.
    waitUntil(
      processSearchPipeline(sessionId, requirement, advancedFilters, sessionStore).catch(
        async (error) => {
          console.error('Pipeline error:', error);
          const current = await sessionStore.get(sessionId);
          if (current) {
            current.status = 'failed';
            current.error = error?.message || 'Unknown error occurred';
            await sessionStore.set(sessionId, current);
          }
        }
      )
    );

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Search POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to start search: ${message}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const session = await createSessionStore().get(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // A serverless function can be killed mid-pipeline, leaving the session in a
    // non-terminal state that the client would poll forever. Age it out.
    const TERMINAL = ['completed', 'failed'];
    if (!TERMINAL.includes(session.status)) {
      const ageMs = Date.now() - new Date(session.createdAt).getTime();
      if (ageMs > 150000) {
        session.status = 'failed';
        session.error =
          'The search stopped before finishing — it likely exceeded the server time limit. Try a narrower requirement.';
      }
    }

    // Polling re-fetches this every couple of seconds, and the removed list is
    // roughly half the payload while being needed only at export time.
    const full = request.nextUrl.searchParams.get('full') === '1';
    if (!full && session.removedCandidates) {
      const { removedCandidates, ...slim } = session;
      return NextResponse.json(slim);
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Search GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch search: ${message}` }, { status: 500 });
  }
}
