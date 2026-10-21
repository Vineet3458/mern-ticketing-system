import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.js';

// Retrieve initial auth state from localStorage if available
const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('accessToken');
const storedRefreshToken = localStorage.getItem('refreshToken');

export const registerUser = createAsyncThunk(
  'auth/register',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/register', formData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ email, otp, type = 'register' }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/verify-otp', { email, otp, type });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'OTP verification failed');
    }
  }
);

export const loginPassword = createAsyncThunk(
  'auth/loginPassword',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login-password', { email, password });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const requestLoginOtp = createAsyncThunk(
  'auth/requestLoginOtp',
  async ({ email, phone }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login-otp', { email, phone });
      return { ...res.data.data, requestedIdentifier: email || phone };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to send login OTP');
    }
  }
);

export const verifyLoginOtp = createAsyncThunk(
  'auth/verifyLoginOtp',
  async ({ email, phone, otp }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/verify-login-otp', { email, phone, otp });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Invalid login OTP');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Continue client cleanup even if network fails
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return true;
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/users/profile');
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser ? JSON.parse(storedUser) : null,
    accessToken: storedToken || null,
    refreshToken: storedRefreshToken || null,
    isAuthenticated: !!storedToken,
    isLoading: false,
    error: null,
    otpPendingEmail: '',
    devOtp: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setPendingEmail: (state, action) => {
      state.otpPendingEmail = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpPendingEmail = action.payload.data.email;
        state.devOtp = action.payload.data.devOtp || null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Verify OTP
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
        state.devOtp = null;
        state.otpPendingEmail = '';

        localStorage.setItem('user', JSON.stringify(action.payload.user));
        localStorage.setItem('accessToken', action.payload.tokens.accessToken);
        localStorage.setItem('refreshToken', action.payload.tokens.refreshToken);
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Password Login
      .addCase(loginPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;

        localStorage.setItem('user', JSON.stringify(action.payload.user));
        localStorage.setItem('accessToken', action.payload.tokens.accessToken);
        localStorage.setItem('refreshToken', action.payload.tokens.refreshToken);
      })
      .addCase(loginPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Request Login OTP
      .addCase(requestLoginOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestLoginOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpPendingEmail = action.payload.requestedIdentifier;
        state.devOtp = action.payload.devOtp || null;
      })
      .addCase(requestLoginOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Verify Login OTP
      .addCase(verifyLoginOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyLoginOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
        state.devOtp = null;

        localStorage.setItem('user', JSON.stringify(action.payload.user));
        localStorage.setItem('accessToken', action.payload.tokens.accessToken);
        localStorage.setItem('refreshToken', action.payload.tokens.refreshToken);
      })
      .addCase(verifyLoginOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.devOtp = null;
      })

      // Profile Fetch
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem('user', JSON.stringify(action.payload));
      });
  },
});

export const { clearError, setPendingEmail } = authSlice.actions;
export default authSlice.reducer;
