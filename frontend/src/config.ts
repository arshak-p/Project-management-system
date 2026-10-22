/**
 * Application Configuration
 * - Local development talks to the Django server on port 8000.
 * - Production uses VITE_API_URL (set at build time, e.g. on Render) or falls back to the live API.
 */

const isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.startsWith('192.168.'));

const DEFAULT_PROD_API = 'https://colour-parrot-mgtsystem.onrender.com';
const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '');

export const API_BASE_URL = isLocal ? 'http://localhost:8000' : (configured || DEFAULT_PROD_API);

export const API_URL = `${API_BASE_URL}/api`;

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export const getWsUrl = (path: string) => {
  const token = localStorage.getItem('access_token');
  return `${WS_BASE_URL}${path}${path.includes('?') ? '&' : '?'}token=${token}`;
};
