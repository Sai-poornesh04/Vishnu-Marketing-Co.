import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const safeJson = async (res, fallback) => {
  try { return await res.json(); } catch { return fallback; }
};

const toMysqlDate = (v) => {
  const s = String(v || "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("-");
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return s;
};

const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");

const cleanItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((it) => ({
      name: String(it?.name ?? "").trim(),
      qty: String(it?.qty ?? "").trim(),
      price: String(it?.price ?? "").trim()
    }))
    .filter((it) => it.name || it.qty || it.price);

const toNum = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

const calcTotalAmount = (items = []) =>
  items.reduce((sum, it) => sum + toNum(it.qty) * toNum(it.price), 0);

const API = "https://vishnu-marketing-co.onrender.com/api/saved-bills";

/* ===================== THUNKS ===================== */
export const fetchAllSavedBills = createAsyncThunk(
  "savedBills/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/all`);
      const data = await safeJson(res, []);
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const searchSavedBillsFromDB = createAsyncThunk(
  "savedBills/search",
  async ({ billNo, customerId, fromDate, toDate }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (billNo) params.set("billNo", String(billNo).trim());
      if (customerId) params.set("customerId", digitsOnly(customerId));
      if (fromDate) params.set("fromDate", toMysqlDate(fromDate));
      if (toDate) params.set("toDate", toMysqlDate(toDate));

      const res = await fetch(`${API}/search?${params.toString()}`);
      const data = await safeJson(res, []);
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteSavedBillFromDB = createAsyncThunk(
  "savedBills/delete",
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });
      const data = await safeJson(res, {});
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);
      dispatch(fetchAllSavedBills());
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ✅ NEW: update existing saved bill (PUT /api/saved-bills/:id)
export const updateSavedBillInDB = createAsyncThunk(
  "savedBills/update",
  async ({ id, billData }, { dispatch, rejectWithValue }) => {
    try {
      const safeId = Number(id);
      if (!safeId) return rejectWithValue("Invalid id");

      const itemsClean = cleanItems(billData?.items || billData?.billTable || []);
      const payload = {
        billNo: String(billData?.billNo ?? "").trim(),
        billDate: toMysqlDate(billData?.billDate ?? billData?.date),
        customerId: digitsOnly(billData?.customerId),
        customerName: String(billData?.customerName ?? "").trim(),
        customerAddress: String(billData?.customerAddress ?? "").trim(),
        totalAmount:
          billData?.totalAmount != null ? toNum(billData.totalAmount) : calcTotalAmount(itemsClean),
        items: itemsClean
      };

      if (!payload.billNo || !payload.billDate || !payload.customerId) {
        return rejectWithValue("Invalid payload (billNo/billDate/customerId required)");
      }

      const res = await fetch(`${API}/${safeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await safeJson(res, {});
      if (!res.ok) return rejectWithValue(data?.error || `HTTP ${res.status}`);

      dispatch(fetchAllSavedBills());
      return { id: safeId, data };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const savedBillsSlice = createSlice({
  name: "savedBills",
  initialState: {
    bills: [],
    searchResults: [],
    loading: false,
    error: null
  },
  reducers: {
    clearSearchResults(state) {
      state.searchResults = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllSavedBills.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllSavedBills.fulfilled, (state, action) => {
        state.loading = false;
        state.bills = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllSavedBills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(searchSavedBillsFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.searchResults = [];
      })
      .addCase(searchSavedBillsFromDB.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(searchSavedBillsFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(deleteSavedBillFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSavedBillFromDB.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteSavedBillFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ✅ update handlers
      .addCase(updateSavedBillInDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSavedBillInDB.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateSavedBillInDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearSearchResults } = savedBillsSlice.actions;
export default savedBillsSlice.reducer;