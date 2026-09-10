let csrf = "";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return undefined as T;
  const data = await response
    .json()
    .catch(() => ({ message: "The server is unavailable. Please try again." }));
  if (!response.ok)
    throw new ApiError(data.message ?? "Request failed.", response.status);
  if (path === "/session") csrf = data.csrf;
  return data as T;
}
