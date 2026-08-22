import { NextRequest, NextResponse } from 'next/server';
import { SearchSession } from '@/types/index';
import { nanoid } from '@/lib/utils';
import { processSearchPipeline } from '@/lib/search/pipeline';

const activeSessions = new Map<string, SearchSession>();

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

    activeSessions.set(sessionId, session);

    // Start pipeline in background
    processSearchPipeline(sessionId, requirement, advancedFilters, activeSessions).catch((error) => {
      console.error('Pipeline error:', error);
      const sess = activeSessions.get(sessionId);
      if (sess) {
        sess.status = 'failed';
        sess.error = error.message;
      }
    });

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Search POST error:', error);
    return NextResponse.json({ error: 'Failed to start search' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const session = activeSessions.get(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Search GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch search' }, { status: 500 });
  }
}
