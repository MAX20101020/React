const API_BASE = "https://localhost:44326/api";

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export async function apiRequest<T>(
  path: string,
  method: string = "GET",
  body: unknown = null,
  auth: boolean = false
): Promise<T> {
  const headers: Record<string, string> = {};

  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE}/${String(path).replace(/^\/+/, "")}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
  });

  const text = await response.text();

  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const err: ApiError = new Error(`HTTP ${response.status}`);
    err.status = response.status;
    err.details = data;

    console.error("API ERROR:", response.status, data);
    throw err;
  }

  return data as T;
}

export function apiGet<T>(path: string, auth: boolean = false): Promise<T> {
  return apiRequest<T>(path, "GET", null, auth);
}

export function apiPost<T>(
  path: string,
  body: unknown,
  auth: boolean = false
): Promise<T> {
  return apiRequest<T>(path, "POST", body, auth);
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  auth: boolean = false
): Promise<T> {
  return apiRequest<T>(path, "PATCH", body, auth);
}

export function apiPut<T>(
  path: string,
  body: unknown,
  auth: boolean = false
): Promise<T> {
  return apiRequest<T>(path, "PUT", body, auth);
}

export function apiDelete<T>(
  path: string,
  auth: boolean = false
): Promise<T> {
  return apiRequest<T>(path, "DELETE", null, auth);
}