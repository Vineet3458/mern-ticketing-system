import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const logDevOtp = (data, fallbackMsg = '') => {
  const otp = data?.data?.devOtp || data?.devOtp;
  if (otp) {
    sessionStorage.setItem('lastDevOtp', String(otp));
    console.log(
      '%c╔══════════════════════════════════════════════════════════════════════╗\n' +
      `║  🔑 [DEV / TESTING OTP CODE]: ${String(otp).padEnd(38)}║\n` +
      '╚══════════════════════════════════════════════════════════════════════╝',
      'color: #10b981; font-weight: bold; font-family: monospace; font-size: 14px; background: #0f172a; padding: 4px;'
    );
    console.log(
      `%c👉 Verification OTP: %c${otp}%c (auto-logged for testing)`,
      'font-size: 14px; font-weight: bold; color: #2563eb;',
      'font-size: 16px; font-weight: 900; color: #10b981; background: #ecfdf5; padding: 2px 8px; border-radius: 4px; border: 1px solid #10b981;',
      'font-size: 12px; color: #64748b;'
    );
  } else if (data?.message && (data.message.includes('OTP:') || data.message.includes('Dev OTP:'))) {
    const match = data.message.match(/OTP:\s*([0-9]{6})/);
    if (match) {
      sessionStorage.setItem('lastDevOtp', match[1]);
      console.log(
        `%c🔑 [TESTING OTP]: %c${match[1]}`,
        'font-size: 14px; font-weight: bold; color: #2563eb;',
        'font-size: 16px; font-weight: 900; color: #10b981; background: #ecfdf5; padding: 2px 8px; border-radius: 4px;'
      );
    }
  }
};

api.interceptors.response.use(
  (response) => {
    if (response?.data) {
      logDevOtp(response.data);
    }
    return response;
  },
  async (error) => {
    if (error.response?.data) {
      logDevOtp(error.response.data);
    }
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and not already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const res = await axios.post(
          '/api/auth/refresh-token',
          { refreshToken: storedRefreshToken },
          { withCredentials: true }
        );

        const newAccessToken = res.data.data.accessToken;
        const newRefreshToken = res.data.data.refreshToken;

        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
