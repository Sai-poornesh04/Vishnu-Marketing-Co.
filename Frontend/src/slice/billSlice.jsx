// src/slice/billSlice.jsx
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../api/api";

/* ===================== ITEMS ===================== */
const baseItems = [
  { name: "Carrot", qty: "", price: "" },
  { name: "Potato", qty: "", price: "" },
  { name: "Cabbage", qty: "", price: "" },
  { name: "Red Cabbage", qty: "", price: "" },
  { name: "Tomato", qty: "", price: "" },
  { name: "Cucumber", qty: "", price: "" },
  { name: "Lemon", qty: "", price: "" },
  { name: "Ginger", qty: "", price: "" },
  { name: "Babycorn", qty: "", price: "" },
  { name: "Spring Onion", qty: "", price: "" },
  { name: "palak", qty: "", price: "" },
  { name: "Cauliflower", qty: "", price: "" },
  { name: "Green chilli", qty: "", price: "" },
  { name: "Mushroom(200g)pac", qty: "", price: "" },
  { name: "Broccoli", qty: "", price: "" },
  { name: "Garlic", qty: "", price: "" },
  { name: "Big Onion", qty: "", price: "" },
  { name: "Beans", qty: "", price: "" },
  { name: "Coriander", qty: "", price: "" },
  { name: "Mint", qty: "", price: "" },
  { name: "Capsicum", qty: "", price: "" },
  { name: "Colour Capsicum", qty: "", price: "" },
  { name: "Celery", qty: "", price: "" },
  { name: "Zucchini Mix", qty: "", price: "" },
  { name: "Basil / pearsley", qty: "", price: "" },
  { name: "Pine apple", qty: "", price: "" },
  { name: "Watermelon", qty: "", price: "" },
  { name: "Apple", qty: "", price: "" }

];

const ROWS = 30;

const makeInitialItems = () => {
  const fixedBase = baseItems.slice(0, ROWS).map((x) => ({ ...x }));
  const blanks = Math.max(0, ROWS - fixedBase.length);

  return [
    ...fixedBase,
    ...Array.from({ length: blanks }, () => ({ name: "", qty: "", price: "" }))
  ];
};

/* ===================== HELPERS ===================== */
const apiErr = (e, fallback = "Request failed") =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");

// Always returns "" or "YYYY-MM-DD"
const toMysqlDate = (v) => {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("-");
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return s;
};

const toNum = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

const cleanItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((it) => ({
      name: String(it?.name ?? "").trim(),
      qty: String(it?.qty ?? "").trim(),
      price: String(it?.price ?? "").trim()
    }))
    .filter((it) => it.name || it.qty || it.price);

const calcTotalAmount = (items = []) =>
  items.reduce((sum, it) => sum + toNum(it.qty) * toNum(it.price), 0);

const buildSavePayload = (billData) => {
  const itemsClean = cleanItems(billData?.items);
  const billDate = billData?.billDate ?? billData?.date;
  const billDateSql = toMysqlDate(billDate);
  const customerIdDigits = digitsOnly(billData?.customerId);

  return {
    billNo: String(billData?.billNo ?? "").trim(),
    billDate: billDateSql,
    customerId: customerIdDigits,
    customerName: String(billData?.customerName ?? "").trim(),
    customerAddress: String(billData?.customerAddress ?? "").trim(),
    totalAmount:
      billData?.totalAmount != null
        ? toNum(billData.totalAmount)
        : calcTotalAmount(itemsClean),
    items: itemsClean
  };
};

/* ===================== SEARCH PRESETS (LOCAL DATE) ===================== */
const ymdLocal = (d) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const monthRange = (yyyyMm) => {
  const s = String(yyyyMm || "");
  if (!/^\d{4}-\d{2}$/.test(s)) return { from: "", to: "" };
  const [y, m] = s.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { from: ymdLocal(first), to: ymdLocal(last) };
};

const todayRange = () => {
  const t = ymdLocal(new Date());
  return { from: t, to: t };
};

const thisMonthRange = () => {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: ymdLocal(first), to: ymdLocal(last) };
};

const lastMonthRange = () => {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const last = new Date(d.getFullYear(), d.getMonth(), 0);
  return { from: ymdLocal(first), to: ymdLocal(last) };
};

const normalizeRange = (fromDate, toDate) => {
  const from = fromDate ? String(fromDate) : "";
  const to = toDate ? String(toDate) : "";
  if (from && to && from > to) return { from: to, to: from };
  return { from: from || "", to: to || "" };
};

/* ===================== THUNKS (AXIOS API) ===================== */
export const saveBillToDB = createAsyncThunk(
  "bill/saveBillToDB",
  async (billData, { dispatch, rejectWithValue }) => {
    try {
      const payload = buildSavePayload(billData);

      if (!payload.billNo || !payload.billDate || !payload.customerId || payload.items.length === 0) {
        return rejectWithValue("Invalid payload (billNo/billDate/customerId/items required)");
      }

      const { data } = await API.post("/api/bills/save", payload);
      dispatch(fetchSavedBills());
      return data;
    } catch (e) {
      return rejectWithValue(apiErr(e));
    }
  }
);

export const updateBillToDB = createAsyncThunk(
  "bill/updateBillToDB",
  async ({ id, billData }, { dispatch, rejectWithValue }) => {
    try {
      const safeId = Number(id);
      if (!safeId) return rejectWithValue("Invalid edit id");

      const payload = buildSavePayload(billData);

      if (!payload.billNo || !payload.billDate || !payload.customerId || payload.items.length === 0) {
        return rejectWithValue("Invalid payload (billNo/billDate/customerId/items required)");
      }

      const { data } = await API.put(`/api/saved-bills/${safeId}`, payload);
      dispatch(fetchSavedBills());
      return data;
    } catch (e) {
      return rejectWithValue(apiErr(e));
    }
  }
);

export const fetchSavedBills = createAsyncThunk(
  "bill/fetchSavedBills",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get("/api/bills/all");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return rejectWithValue(apiErr(e));
    }
  }
);

export const searchBillsFromDB = createAsyncThunk(
  "bill/searchBillsFromDB",
  async ({ billNo, customerId, fromDate, toDate, month, preset }, { rejectWithValue }) => {
    try {
      let f = fromDate ? toMysqlDate(fromDate) : "";
      let t = toDate ? toMysqlDate(toDate) : "";

      if (month) {
        const r = monthRange(String(month));
        f = r.from;
        t = r.to;
      } else if (preset === "TODAY") {
        const r = todayRange();
        f = r.from;
        t = r.to;
      } else if (preset === "THIS_MONTH") {
        const r = thisMonthRange();
        f = r.from;
        t = r.to;
      } else if (preset === "LAST_MONTH") {
        const r = lastMonthRange();
        f = r.from;
        t = r.to;
      }

      const range = normalizeRange(f, t);

      const params = {};
      if (billNo) params.billNo = String(billNo).trim();
      if (customerId) params.customerId = digitsOnly(customerId);
      if (range.from) params.fromDate = range.from;
      if (range.to) params.toDate = range.to;

      const { data } = await API.get("/api/bills/search", { params });
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return rejectWithValue(apiErr(e));
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  "bill/fetchCustomerById",
  async (id, { rejectWithValue }) => {
    try {
      const safeId = digitsOnly(id);
      if (!safeId) return null;

      const { data } = await API.get(`/api/bills/customers/${safeId}`);
      return data || null;
    } catch (e) {
      if (e?.response?.status === 404) return null;
      return rejectWithValue(apiErr(e, "Customer fetch failed"));
    }
  }
);

/* ===================== SLICE ===================== */
const billSlice = createSlice({
  name: "bill",
  initialState: {
    billNo: localStorage.getItem("lastBillNo") || "001",
    date: ymdLocal(new Date()),

    customerId: "",
    customerName: "",
    customerAddress: "",

    items: makeInitialItems(),

    showShareDropdown: false,
    showMenuDropdown: false,
    showSearchModal: false,

    searchBillNo: "",
    searchCustomerId: "",
    searchFromDate: "",
    searchToDate: "",
    searchMonth: "",
    searchPreset: "",

    searchResults: [],
    savedBills: [],

    editId: null,

    loading: false,
    error: null
  },

  reducers: {
    setBillNo(state, action) {
      state.billNo = action.payload;
    },
    setDate(state, action) {
      state.date = toMysqlDate(action.payload);
    },

    setCustomerId(state, action) {
      state.customerId = digitsOnly(action.payload);
    },
    setCustomerName(state, action) {
      state.customerName = action.payload ?? "";
    },
    setCustomerAddress(state, action) {
      state.customerAddress = action.payload ?? "";
    },

    setEditId(state, action) {
      const v = action.payload;
      state.editId = v == null || v === "" ? null : Number(v) || null;
    },
    clearEditId(state) {
      state.editId = null;
    },

    updateItem(state, action) {
      const { index, field, value } = action.payload;

      if (index < 0 || index >= ROWS) return;

      if (!Array.isArray(state.items) || state.items.length !== ROWS) {
        state.items = makeInitialItems();
      }

      if (field === "qty" || field === "price") {
        const s = String(value ?? "");
        const cleaned = s.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");
        state.items[index][field] =
          parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
      } else {
        state.items[index][field] = value ?? "";
      }
    },

    resetBill(state) {
      state.date = ymdLocal(new Date());
      state.customerId = "";
      state.customerName = "";
      state.customerAddress = "";
      state.items = makeInitialItems();
      state.error = null;
      state.editId = null;
    },

    newBill(state) {
      const next = String(parseInt(state.billNo, 10) + 1).padStart(3, "0");
      state.billNo = next;
      localStorage.setItem("lastBillNo", next);

      state.date = ymdLocal(new Date());
      state.customerId = "";
      state.customerName = "";
      state.customerAddress = "";
      state.items = makeInitialItems();
      state.error = null;
      state.editId = null;
    },

    toggleShare(state, action) {
      state.showShareDropdown =
        typeof action.payload === "boolean" ? action.payload : !state.showShareDropdown;
    },
    toggleMenu(state, action) {
      state.showMenuDropdown =
        typeof action.payload === "boolean" ? action.payload : !state.showMenuDropdown;
    },

    openSearch(state) {
      state.showSearchModal = true;
    },
    closeSearch(state) {
      state.showSearchModal = false;
      state.searchBillNo = "";
      state.searchCustomerId = "";
      state.searchFromDate = "";
      state.searchToDate = "";
      state.searchMonth = "";
      state.searchPreset = "";
      state.searchResults = [];
    },

    setSearchBillNo(state, action) {
      state.searchBillNo = action.payload ?? "";
    },
    setSearchCustomerId(state, action) {
      state.searchCustomerId = digitsOnly(action.payload);
    },

    setSearchFromDate(state, action) {
      state.searchFromDate = toMysqlDate(action.payload ?? "");
      state.searchMonth = "";
      state.searchPreset = "";
    },
    setSearchToDate(state, action) {
      state.searchToDate = toMysqlDate(action.payload ?? "");
      state.searchMonth = "";
      state.searchPreset = "";
    },

    setSearchMonth(state, action) {
      state.searchMonth = String(action.payload ?? "");
      state.searchPreset = "";
      if (/^\d{4}-\d{2}$/.test(state.searchMonth)) {
        const r = monthRange(state.searchMonth);
        state.searchFromDate = r.from || "";
        state.searchToDate = r.to || "";
      }
    },

    setSearchPreset(state, action) {
      const p = String(action.payload ?? "");
      state.searchPreset = p;
      state.searchMonth = "";

      let r = { from: "", to: "" };
      if (p === "TODAY") r = todayRange();
      else if (p === "THIS_MONTH") r = thisMonthRange();
      else if (p === "LAST_MONTH") r = lastMonthRange();

      state.searchFromDate = r.from || "";
      state.searchToDate = r.to || "";
    },

    setSearchResults(state, action) {
      state.searchResults = Array.isArray(action.payload) ? action.payload : [];
    },

    clearSearchFilters(state) {
      state.searchBillNo = "";
      state.searchCustomerId = "";
      state.searchFromDate = "";
      state.searchToDate = "";
      state.searchMonth = "";
      state.searchPreset = "";
      state.searchResults = [];
    }
  },

  extraReducers: (builder) => {
    builder
      .addCase(saveBillToDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveBillToDB.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(saveBillToDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(updateBillToDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBillToDB.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateBillToDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchSavedBills.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedBills.fulfilled, (state, action) => {
        state.loading = false;
        state.savedBills = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSavedBills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(searchBillsFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.searchResults = [];
      })
      .addCase(searchBillsFromDB.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(searchBillsFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.searchResults = [];
      })

      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        if (!action.payload) return;
        state.customerId = digitsOnly(action.payload.id);
        state.customerName = action.payload.customerName || "";
        state.customerAddress = action.payload.customerAddress || "";
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

export const {
  setBillNo,
  setDate,
  setCustomerId,
  setCustomerName,
  setCustomerAddress,
  setEditId,
  clearEditId,
  updateItem,
  resetBill,
  newBill,
  toggleShare,
  toggleMenu,
  openSearch,
  closeSearch,
  setSearchBillNo,
  setSearchCustomerId,
  setSearchFromDate,
  setSearchToDate,
  setSearchMonth,
  setSearchPreset,
  setSearchResults,
  clearSearchFilters
} = billSlice.actions;

export default billSlice.reducer;