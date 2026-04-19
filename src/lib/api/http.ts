const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL?.trim() ??
  import.meta.env.VITE_API_BASE?.trim() ??
  "";

// Use explicit API base in production when configured.
// Fallback to relative paths so local Vite proxy keeps working.
export const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  body?: string;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, body?: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  suppressErrorStatuses?: number[];
};

function withApiBase(path: string): string {
  if (!API_BASE) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildApiError(path: string, method: string, status: number, body: string): ApiError {
  if (body) {
    try {
      const parsed = JSON.parse(body) as {
        error?: {
          code?: string;
          message?: string;
          details?: unknown;
        };
      };
      const message = parsed.error?.message?.trim();
      if (message) {
        return new ApiError(message, status, body, parsed.error?.code, parsed.error?.details);
      }
    } catch {
      // Fall through to the generic HTTP error below when the body is not JSON.
    }
  }

  return new ApiError(`${method} ${path} failed: ${status}`, status, body);
}

export async function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Adicionar token JWT se existir
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(withApiBase(path), {
      method: "GET",
      credentials: "include",
      headers,
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw buildApiError(path, "GET", res.status, errorBody);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`GET ${path} returned non-JSON response: ${contentType}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    const isSuppressed =
      error instanceof ApiError && options?.suppressErrorStatuses?.includes(error.status);

    if (!isSuppressed) {
      console.warn(`API call failed: ${path}`, error);
    }
    throw error;
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Adicionar token JWT se existir
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(withApiBase(path), {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw buildApiError(path, "POST", res.status, errorBody);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`POST ${path} returned non-JSON response: ${contentType}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    console.warn(`API call failed: ${path}`, error);
    throw error;
  }
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(withApiBase(path), {
      method: "PUT",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw buildApiError(path, "PUT", res.status, errorBody);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`PUT ${path} returned non-JSON response: ${contentType}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    console.warn(`API call failed: ${path}`, error);
    throw error;
  }
}

export async function apiDelete<T>(path: string): Promise<T> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Adicionar token JWT se existir
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(withApiBase(path), {
      method: "DELETE",
      credentials: "include",
      headers,
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw buildApiError(path, "DELETE", res.status, errorBody);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`DELETE ${path} returned non-JSON response: ${contentType}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    console.warn(`API call failed: ${path}`, error);
    throw error;
  }
}
