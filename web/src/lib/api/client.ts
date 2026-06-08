/**
 * Typed fetch client for the gt bridge API.
 *
 * Thin on purpose: TanStack Query owns caching, retries, and refetching.
 * This layer only does transport + typed error surfacing.
 */

export class ApiError extends Error {
  status: number;
  errorType?: string;
  data?: unknown;

  constructor(message: string, status: number, errorType?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(
      body?.error ?? `Request failed (${res.status})`,
      res.status,
      body?.errorType,
      body,
    );
  }

  // Some endpoints (204) return no body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  del: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
