import { SearchSession } from '@/types/index';
import * as fs from 'fs/promises';
import * as path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), '.sessions');
const TTL_SECONDS = 24 * 60 * 60;

export interface SessionStore {
  set(sessionId: string, session: SearchSession): Promise<void>;
  get(sessionId: string): Promise<SearchSession | null>;
  delete(sessionId: string): Promise<void>;
}

/**
 * Local development: sessions live on disk.
 * Not usable on serverless — the filesystem is read-only and each invocation
 * may land on a different instance.
 */
export class FileSessionStore implements SessionStore {
  private async ensureDir(): Promise<void> {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
  }

  async set(sessionId: string, session: SearchSession): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(session), 'utf-8');
  }

  async get(sessionId: string): Promise<SearchSession | null> {
    try {
      const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
      return JSON.parse(await fs.readFile(filePath, 'utf-8')) as SearchSession;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await fs.unlink(path.join(SESSIONS_DIR, `${sessionId}.json`));
    } catch {
      /* already gone */
    }
  }
}

/**
 * Serverless: sessions live in Upstash Redis, shared across invocations.
 * Uses the REST API over plain fetch, so no extra dependency is required.
 */
export class RedisSessionStore implements SessionStore {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  private async command(args: (string | number)[]): Promise<unknown> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Redis error ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(`Redis error: ${body.error}`);
    return body.result;
  }

  async set(sessionId: string, session: SearchSession): Promise<void> {
    await this.command(['SET', `session:${sessionId}`, JSON.stringify(session), 'EX', TTL_SECONDS]);
  }

  async get(sessionId: string): Promise<SearchSession | null> {
    const result = await this.command(['GET', `session:${sessionId}`]);
    if (typeof result !== 'string') return null;
    return JSON.parse(result) as SearchSession;
  }

  async delete(sessionId: string): Promise<void> {
    await this.command(['DEL', `session:${sessionId}`]);
  }
}

/**
 * Picks Redis when its credentials are present (production), otherwise falls
 * back to disk so local development needs no extra services.
 */
export function createSessionStore(): SessionStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) return new RedisSessionStore(url, token);

  if (process.env.VERCEL) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set — ' +
        'serverless cannot persist sessions to disk.'
    );
  }

  return new FileSessionStore();
}
