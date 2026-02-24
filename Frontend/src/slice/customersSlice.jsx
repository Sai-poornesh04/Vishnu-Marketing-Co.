import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_CUSTOMERS = "https://vishnu-marketing-co.onrender.com/api/customers";

const safeJson = async (res, fallback) => {
  try { return await res.json(); } catch { return fallback; }
};

export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_CUSTOMERS}/all`);  // ✅ FIXED
      const data = await safeJson(res, []);
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/updateCustomer",
  async ({ id, customerName, customerAddress }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_CUSTOMERS}/${id}`, {   // ✅ FIXED
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerAddress })
      });

      const data = await safeJson(res, {});
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);

      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const customersSlice = createSlice({
  name: "customers",
  initialState: {
    rows: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCustomers.fulfilled, (state, action) => {
      state.rows = action.payload;
    });
  }
});

export default customersSlice.reducer;