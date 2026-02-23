// src/slice/customersSlice.jsx
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE = "http://localhost:5000/api/customers";

const safeJson = async (res, fallback) => {
  try {
    return await res.json();
  } catch {
    return fallback;
  }
};

const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");
const norm = (s) => String(s ?? "").trim();

/* ================= FETCH ================= */

export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE}/all`);

      if (!res.ok) {
        const err = await safeJson(res, {});
        return rejectWithValue(
          err?.message || err?.error || `HTTP ${res.status}`
        );
      }

      const data = await safeJson(res, []);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return rejectWithValue(e.message || "Server not reachable");
    }
  }
);

/* ================= UPDATE ================= */

export const updateCustomer = createAsyncThunk(
  "customers/updateCustomer",
  async ({ id, customerName, customerAddress }, { rejectWithValue }) => {
    try {
      const cid = digitsOnly(id);
      if (!cid) return rejectWithValue("Invalid customer id");

      const payload = {
        customerName: norm(customerName),
        customerAddress: norm(customerAddress)
      };

      const res = await fetch(`${API_BASE}/${cid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await safeJson(res, {});
        return rejectWithValue(
          err?.message || err?.error || `HTTP ${res.status}`
        );
      }

      const data = await safeJson(res, {});

      return {
        id: Number(cid),
        customerName: payload.customerName,
        customerAddress: payload.customerAddress,
        ...data
      };
    } catch (e) {
      return rejectWithValue(e.message || "Update failed");
    }
  }
);

/* ================= SAVE ALL ================= */

export const saveAllCustomers = createAsyncThunk(
  "customers/saveAllCustomers",
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { customers } = getState();
      const dirtyIds = Object.keys(customers.dirtyById || {}).filter(
        (k) => customers.dirtyById[k]
      );

      for (const id of dirtyIds) {
        const row = customers.editsById?.[id];
        if (!row) continue;

        await dispatch(
          updateCustomer({
            id,
            customerName: row.customerName,
            customerAddress: row.customerAddress
          })
        ).unwrap();
      }

      return { saved: dirtyIds.length };
    } catch (e) {
      return rejectWithValue(e.message || "Bulk save failed");
    }
  }
);

/* ================= SLICE ================= */

const customersSlice = createSlice({
  name: "customers",
  initialState: {
    rows: [],
    loading: false,
    saving: false,
    error: null,
    editsById: {},
    dirtyById: {}
  },

  reducers: {
    setEditField(state, action) {
      const { id, field, value } = action.payload;
      const key = String(id);

      const base = state.rows.find((r) => String(r.id) === key) || {};

      if (!state.editsById[key]) {
        state.editsById[key] = {
          customerName: base.customerName ?? "",
          customerAddress: base.customerAddress ?? ""
        };
      }

      state.editsById[key][field] = value ?? "";
      state.dirtyById[key] = true;
    },

    discardEdits(state, action) {
      const id = action.payload;

      if (id == null) {
        state.editsById = {};
        state.dirtyById = {};
        return;
      }

      const key = String(id);
      delete state.editsById[key];
      delete state.dirtyById[key];
    }
  },

  extraReducers: (builder) => {
    builder
      /* FETCH */
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = Array.isArray(action.payload)
          ? action.payload
          : [];

        const existing = new Set(state.rows.map((r) => String(r.id)));

        Object.keys(state.editsById).forEach((k) => {
          if (!existing.has(k)) {
            delete state.editsById[k];
            delete state.dirtyById[k];
          }
        });
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.rows = [];
        state.error = action.payload || "Failed to load customers";
      })

      /* UPDATE */
      .addCase(updateCustomer.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.saving = false;

        const updated = action.payload;
        const key = String(updated.id);

        const idx = state.rows.findIndex(
          (r) => String(r.id) === key
        );

        if (idx >= 0) {
          state.rows[idx] = {
            ...state.rows[idx],
            ...updated
          };
        }

        delete state.editsById[key];
        delete state.dirtyById[key];
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Customer update failed";
      })

      /* SAVE ALL */
      .addCase(saveAllCustomers.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveAllCustomers.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(saveAllCustomers.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Save all failed";
      });
  }
});

export const { setEditField, discardEdits } = customersSlice.actions;
export default customersSlice.reducer;