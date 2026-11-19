/*
  fetch() for the Express API. In dev, Vite proxies /api to localhost:3001 (see vite.config.js).
*/
import { getToken } from '@/lib/auth';

/** What the server sent back when a request failed. `code` is the server's `error` field. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Sentences for the error codes in server/src (auth middleware, routes, errors.ts). */
const MESSAGES: Record<string, string> = {
  not_signed_in: 'Sign in to do that.',
  invalid_token: 'Your session has ended. Sign in again.',
  email_not_verified: 'Verify your email first: check your inbox for the link we sent.',
  banned: 'This account can’t post.',
  forbidden: 'Your account can’t do that.',
  not_found: 'That isn’t here any more.',
  invalid_input: 'Some of the details weren’t accepted. Check the form and try again.',
  internal_error: 'Something went wrong on our side. Try again in a minute.',
};

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the signed-in user's token. Throws ApiError(401) if nobody is signed in. */
  auth?: boolean;
};

export async function request<T>(
  path: string,
  { method = 'GET', body, auth = false }: Options = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getToken();
    if (!token) throw new ApiError(401, 'not_signed_in', MESSAGES.not_signed_in!);
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'network',
      'Couldn’t reach the server. Check your connection and try again.',
    );
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const { error, message } = (data ?? {}) as { error?: string; message?: string };
    const code = error ?? 'internal_error';
    throw new ApiError(res.status, code, message ?? MESSAGES[code] ?? MESSAGES.internal_error!);
  }
  return data as T;
}
