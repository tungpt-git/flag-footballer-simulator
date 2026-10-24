/** Failed JSON request. `status` is the HTTP status from the server. */
export class HttpRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpRequestError";
    this.status = status;
  }
}

/** JSON `fetch` wrapper shared by every module's API client. Throws with the server's error message. */
export const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpRequestError(body.error ?? `Request failed (${response.status})`, response.status);
  return body as T;
};
