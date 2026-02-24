import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

/* ===================== ITEMS ===================== */
const baseItems = [
  { name: "Carrot", qty: "", price: "" },
  { name: "Beans", qty: "", price: "" },
  { name: "Capsicum", qty: "", price: "" },
  { name: "Colour Capsicum", qty: "", price: "" },
  { name: "Cabbage", qty: "", price: "" },
  { name: "Coriander Leaves", qty: "", price: "" },
  { name: "Mint", qty: "", price: "" },
  { name: "Spring Onion", qty: "", price: "" },
  { name: "Palak", qty: "", price: "" },
  { name: "Potato", qty: "", price: "" },
  { name: "Cauliflower", qty: "", price: "" },
  { name: "Green Chilli", qty: "", price: "" },
  { name: "Babycorn peeled", qty: "", price: "" },
  { name: "Mushroom(200g)pac", qty: "", price: "" },
  { name: "Garlic peel", qty: "", price: "" },
  { name: "Big onion", qty: "", price: "" },
  { name: "Ginger", qty: "", price: "" },
  { name: "Lemon", qty: "", price: "" },
  { name: "Cucumber", qty: "", price: "" }
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

/* ===================== API ===================== */
/* ✅ FIXED FROM LOCALHOST TO RENDER */
const API_BASE = "https://vishnu-marketing-co.onrender.com/api/bills";
const API_SAVED = "https://vishnu-marketing-co.onrender.com/api/saved-bills";
const API_CUSTOMERS = "https://vishnu-marketing-co.onrender.com/api/customers";

/* ===================== HELPERS ===================== */
const safeJson = async (res, fallback) => {
  try { return await res.json(); } catch { return fallback; }
};

const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");

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

/* ===================== THUNKS ===================== */

export const saveBillToDB = createAsyncThunk(
  "bill/saveBillToDB",
  async (billData, { dispatch, rejectWithValue }) => {
    try {
      const payload = buildSavePayload(billData);

      if (!payload.billNo || !payload.billDate || !payload.customerId || payload.items.length === 0) {
        return rejectWithValue("Invalid payload (billNo/billDate/customerId/items required)");
      }

      const res = await fetch(`${API_BASE}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await safeJson(res, {});
      if (!res.ok) return rejectWithValue(data?.message || data?.error || `HTTP ${res.status}`);

      dispatch(fetchSavedBills());
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
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

      const res = await fetch(`${API_SAVED}/${safeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await safeJson(res, {});
      if (!res.ok) return rejectWithValue(data?.message || data?.error || `HTTP ${res.status}`);

      dispatch(fetchSavedBills());
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchSavedBills = createAsyncThunk(
  "bill/fetchSavedBills",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE}/all`);
      const data = await safeJson(res, []);
      if (!res.ok) return rejectWithValue(data?.message || data?.error || `HTTP ${res.status}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const searchBillsFromDB = createAsyncThunk(
  "bill/searchBillsFromDB",
  async ({ billNo, customerId, fromDate, toDate }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (billNo) params.set("billNo", String(billNo).trim());
      if (customerId) params.set("customerId", digitsOnly(customerId));
      if (fromDate) params.set("fromDate", toMysqlDate(fromDate));
      if (toDate) params.set("toDate", toMysqlDate(toDate));

      const res = await fetch(`${API_BASE}/search?${params.toString()}`);
      const data = await safeJson(res, []);
      if (!res.ok) return rejectWithValue(data?.message || data?.error || `HTTP ${res.status}`);

      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  "bill/fetchCustomerById",
  async (id, { rejectWithValue }) => {
    try {
      const safeId = digitsOnly(id);
      if (!safeId) return null;

      /* ✅ FIXED WRONG ROUTE */
      const res = await fetch(`${API_CUSTOMERS}/${safeId}`);
      if (res.status === 404) return null;

      const data = await safeJson(res, {});
      if (!res.ok) return rejectWithValue(data?.message || data?.error || "Customer fetch failed");

      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/* ===================== SLICE ===================== */

const billSlice = createSlice({
  name: "bill",
  initialState: {
    billNo: localStorage.getItem("lastBillNo") || "001",
    date: new Date().toISOString().slice(0, 10),
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
    setBillNo(state, action) { state.billNo = action.payload; },
    setDate(state, action) { state.date = action.payload; },
    setCustomerId(state, action) { state.customerId = digitsOnly(action.payload); },
    setCustomerName(state, action) { state.customerName = action.payload ?? ""; },
    setCustomerAddress(state, action) { state.customerAddress = action.payload ?? ""; },
    setEditId(state, action) { state.editId = action.payload ?? null; },
    clearEditId(state) { state.editId = null; },
    updateItem(state, action) {
      const { index, field, value } = action.payload;
      if (state.items[index]) state.items[index][field] = value;
    },
    resetBill(state) {
      state.items = makeInitialItems();
      state.customerId = "";
      state.customerName = "";
      state.customerAddress = "";
      state.editId = null;
    }
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
  resetBill
} = billSlice.actions;

export default billSlice.reducer;