const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'biwa-session-token';

export const getAuthToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token) => {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
};

export async function api(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed');
  return data;
}
