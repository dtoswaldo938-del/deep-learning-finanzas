/** Backend origin for local development or an explicitly configured deployment. */
const configured = import.meta.env.VITE_API_URL?.trim()

export const API_BASE_URL = (configured || 'http://127.0.0.1:8001').replace(/\/+$/, '')
