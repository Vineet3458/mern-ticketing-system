const configuredBackendUrl = import.meta.env.VITE_API_URL?.trim();
const developmentBackendUrl = import.meta.env.DEV ? 'http://127.0.0.1:5000' : '';

export const backendOrigin = (configuredBackendUrl || developmentBackendUrl).replace(/\/+$/, '');

if (!backendOrigin) {
  throw new Error('VITE_API_URL is not configured');
}
