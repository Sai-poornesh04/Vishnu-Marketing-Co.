// src/slice/authSlice.jsx
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../api/api";

const initialState = {
  token: localStorage.getItem("token") || null,
  isLoggedIn: !!localStorage.getItem("token"),
  user: null,
  loading: false,
  error: null
};

const apiErr = (e, fallback = "Request failed") =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const { data } = await API.post("/api/auth/login", {
        username: String(username || "").trim(),
        password: String(password || "").trim()
      });

      const token = data?.token || data?.accessToken;
      if (!token) return rejectWithValue(data?.message || "Token not returned");

      localStorage.setItem("token", token);

      return {
        token,
        user: data?.user || { username: String(username || "").trim() }
      };
    } catch (e) {
      return rejectWithValue(apiErr(e, "Login failed"));
    }
  }
);

export const fetchMe = createAsyncThunk(
  "auth/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get("/api/auth/me");
      return data?.user || data;
    } catch (e) {
      return rejectWithValue(apiErr(e, "Fetch user failed"));
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // compatibility export so old code `dispatch(login(...))` won't crash
    login(state, action) {
      state.isLoggedIn = true;
      state.user = action.payload ?? null;
    },
    logout(state) {
      state.token = null;
      state.isLoggedIn = false;
      state.user = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem("token");
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.loading = false;
        s.token = a.payload.token;
        s.isLoggedIn = true;
        s.user = a.payload.user;
      })
      .addCase(loginUser.rejected, (s, a) => {
        s.loading = false;
        s.token = null;
        s.isLoggedIn = false;
        s.user = null;
        s.error = a.payload;
        localStorage.removeItem("token");
      })
      .addCase(fetchMe.fulfilled, (s, a) => {
        s.isLoggedIn = true;
        s.user = a.payload ?? null;
      })
      .addCase(fetchMe.rejected, (s, a) => {
        s.error = a.payload;
      });
  }
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;