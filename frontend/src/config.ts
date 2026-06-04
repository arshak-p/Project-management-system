/**
 * Application Configuration
 * Detects whether we are running locally or in production
 */

// If we're on localhost or 127.0.0.1, use local API
// Otherwise use the production Render URL
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.startsWith('192.168.'));

export const API_BASE_URL = isLocal 
  ? 'http://localhost:8000' 
  : 'https://colour-parrot-mgtsystem.onrender.com';

export const API_URL = `${API_BASE_URL}/api`;

export const WS_BASE_URL = isLocal
  ? 'ws://localhost:8000'
  : 'wss://colour-parrot-mgtsystem.onrender.com';

export const getWsUrl = (path: string) => {
  const token = localStorage.getItem('access_token');
  return `${WS_BASE_URL}${path}${path.includes('?') ? '&' : '?'}token=${token}`;
};
