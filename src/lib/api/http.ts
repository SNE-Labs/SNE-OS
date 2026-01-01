// In production: use relative paths (Vercel proxy handles /api/* → backend)
// In development: Vite proxy handles /api/* → localhost:5000
export const API_BASE = "";

export async function apiGet<T>(path: string): Promise<T> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Adicionar token JWT se existir
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      credentials: "include",
      headers,
    });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`GET ${path} returned non-JSON response: ${contentType}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    console.warn(`API call failed: ${path}`, error);
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

    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);

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

export async function apiDelete<T>(path: string): Promise<T> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Adicionar token JWT se existir
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      credentials: "include",
      headers,
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);

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