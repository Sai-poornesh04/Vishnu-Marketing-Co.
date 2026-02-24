import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

/* ================= API ================= */
const API_ROOT = "https://vishnu-marketing-co.onrender.com/api";

const API_BILLS = `${API_ROOT}/bills`;
const API_SAVED = `${API_ROOT}/saved-bills`;
const API_CUSTOMERS = `${API_ROOT}/customers`;

/* ================= HELPERS ================= */
const safeJson = async (res, fallback) => {
  try { return await res.json(); } catch { return fallback; }
};

const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");

/* ================= THUNKS ================= */

// SAVE BILL
export const saveBillToDB = createAsyncThunk(
  "bill/saveBillToDB",
  async (billData, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_SAVED}`, {   // ✅ FIXED
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billData)
      });

      const data = await safeJson(res, {});
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);

      dispatch(fetchSavedBills());
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// UPDATE BILL
export const updateBillToDB = createAsyncThunk(
  "bill/updateBillToDB",
  async ({ id, billData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_SAVED}/${id}`, {   // ✅ FIXED
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billData)
      });

      const data = await safeJson(res, {});
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);

      dispatch(fetchSavedBills());
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// FETCH ALL SAVED BILLS
export const fetchSavedBills = createAsyncThunk(
  "bill/fetchSavedBills",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_SAVED}`);   // ✅ FIXED
      const data = await safeJson(res, []);
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// SEARCH
export const searchBillsFromDB = createAsyncThunk(
  "bill/searchBillsFromDB",
  async (paramsObj, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(paramsObj);
      const res = await fetch(`${API_SAVED}/search?${params.toString()}`);  // ✅ FIXED
      const data = await safeJson(res, []);
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// FETCH CUSTOMER BY ID
export const fetchCustomerById = createAsyncThunk(
  "bill/fetchCustomerById",
  async (id, { rejectWithValue }) => {
    try {
      const safeId = digitsOnly(id);
      if (!safeId) return null;

      const res = await fetch(`${API_CUSTOMERS}/${safeId}`);   // ✅ FIXED
      if (res.status === 404) return null;

      const data = await safeJson(res, {});
      if (!res.ok) return rejectWithValue(data?.error);

      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/* ================= SLICE ================= */

const billSlice = createSlice({
  name: "bill",
  initialState: {
    savedBills: [],
    searchResults: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSavedBills.fulfilled, (state, action) => {
        state.savedBills = action.payload;
      })
      .addCase(searchBillsFromDB.fulfilled, (state, action) => {
        state.searchResults = action.payload;
      });
  }
});

export default billSlice.reducer;