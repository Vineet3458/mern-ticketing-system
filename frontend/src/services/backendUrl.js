const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.DEV ? 'http://127.0.0.1:5000' : '');

export const backendOrigin = configuredBackendUrl.replace(/\/+$/, '');
