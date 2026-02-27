import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Bill/bill.css"; 
import "./customer.css";

const API = "https://vishnu-marketing-co.onrender.com/api/customers";

export default function Customers() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  // Add Customer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", address: "" });

  // filters
  const [q, setQ] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);

  // inline toast
  const [toast, setToast] = useState({ show: false, type: "success", text: "" });
  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/all`);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);

      const list = Array.isArray(data) ? data : [];
      setRows(
        list.map((r) => ({
          id: Number(r.id),
          customerName: r.customerName ?? "",
          customerAddress: r.customerAddress ?? "",
          _origName: r.customerName ?? "",
          _origAddr: r.customerAddress ?? ""
        }))
      );
    } catch (e) {
      setError(String(e.message || "Failed to load customers"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = (r) =>
    String(r.customerName ?? "") !== String(r._origName ?? "") ||
    String(r.customerAddress ?? "") !== String(r._origAddr ?? "");

  const onChange = (id, key, val) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  };

  // --- ADD NEW CUSTOMER LOGIC ---
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const name = newCust.name.trim();
    const addr = newCust.address.trim();

    if (!name) return showToast("error", "Customer name is required");

    setAdding(true);
    try {
      const res = await fetch(`${API}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name, customerAddress: addr })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);

      showToast("success", "Customer Added Successfully!");
      setShowAddModal(false);
      setNewCust({ name: "", address: "" }); // reset form
      load(); // refresh the table
    } catch (e) {
      showToast("error", String(e.message || "Failed to add customer"));
    } finally {
      setAdding(false);
    }
  };

  const save = async (row) => {
    const name = String(row.customerName ?? "").trim();
    const addr = String(row.customerAddress ?? "").trim();

    if (!name) {
      showToast("error", "Customer name required");
      return;
    }

    setSavingId(row.id);
    setError("");
    try {
      const res = await fetch(`${API}/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name, customerAddress: addr })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, customerName: name, customerAddress: addr, _origName: name, _origAddr: addr }
            : r
        )
      );
      showToast("success", "Saved!");
    } catch (e) {
      showToast("error", String(e.message || "Update failed"));
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    const dirty = rows.filter(isDirty);
    if (dirty.length === 0) return;
    
    let successCount = 0;
    for (const r of dirty) {
      await save(r);
      successCount++;
    }
    showToast("success", `Saved ${successCount} customers`);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = rows;

    if (s) {
      list = list.filter((r) => {
        const id = String(r.id);
        const name = String(r.customerName || "").toLowerCase();
        const addr = String(r.customerAddress || "").toLowerCase();
        return id.includes(s) || name.includes(s) || addr.includes(s);
      });
    }

    if (onlyChanged) list = list.filter(isDirty);

    return list;
  }, [rows, q, onlyChanged]);

  const dirtyCount = useMemo(() => rows.filter(isDirty).length, [rows]);

  const onBackToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  return (
    <div className="bill-app-container">
      {/* --- FLOATING ACTION BAR --- */}
      <div className="bill-action-bar">
        <button className="action-btn outline" onClick={onBackToDashboard}>
          ← Back
        </button>
        
        <button 
          className={`action-btn ${dirtyCount > 0 ? "primary" : "outline"}`} 
          onClick={saveAll} 
          disabled={dirtyCount === 0 || savingId != null}
        >
          {savingId ? "Saving..." : `💾 Save All (${dirtyCount})`}
        </button>

        <button className="action-btn danger-outline" onClick={onLogout}>
          Logout
        </button>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="customers-content">
        <div className="page-header">
          <h2>Customer Database</h2>
          <p>Manage addresses and details for quick billing</p>
        </div>

        {/* Filters Bar */}
        <div className="customers-filters glass-panel staggered-1">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="customers-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ID, name, or address..."
            />
          </div>

          <div className="filter-toggles">
            <button className="action-btn primary" onClick={() => setShowAddModal(true)}>
              ➕ Add Customer
            </button>
            
            <label className={`toggle-pill ${onlyChanged ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={onlyChanged}
                onChange={(e) => setOnlyChanged(e.target.checked)}
                hidden
              />
              {onlyChanged ? "Showing Changed" : "Show Changed"}
            </label>
            
            <button className="refresh-btn" onClick={load} disabled={loading || savingId != null}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {error && <div className="customers-error staggered-2">{error}</div>}

        {/* Glass Table Wrapper */}
        <div className="customers-table-wrap glass-panel hover-3d staggered-3">
          <table className="customers-table">
            <thead>
              <tr>
                <th className="col-id">ID</th>
                <th>Name</th>
                <th>Address</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, index) => {
                const dirty = isDirty(r);
                return (
                  <tr key={r.id} className={dirty ? "row-dirty" : ""} style={{ animationDelay: `${index * 0.05}s` }}>
                    <td className="col-id"><span className="id-badge">#{r.id}</span></td>
                    <td>
                      <input
                        className="customers-cell-input"
                        value={r.customerName}
                        onChange={(e) => onChange(r.id, "customerName", e.target.value)}
                        placeholder="Customer name"
                      />
                    </td>
                    <td>
                      <input
                        className="customers-cell-input"
                        value={r.customerAddress}
                        onChange={(e) => onChange(r.id, "customerAddress", e.target.value)}
                        placeholder="Customer address"
                      />
                    </td>
                    <td className="col-action">
                      <button
                        className={`cell-save-btn ${dirty ? "active" : ""}`}
                        onClick={() => save(r)}
                        disabled={!dirty || savingId === r.id}
                      >
                        {savingId === r.id ? "..." : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="customers-empty">
                    <div className="empty-icon">📂</div>
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && <div className="customers-loading-overlay">Loading...</div>}
        </div>

        <div className="customers-foot staggered-4">
          <span>Total Database: <strong>{rows.length}</strong></span>
          <span>Currently Showing: <strong>{filtered.length}</strong></span>
        </div>
      </div>

      {/* --- ADD CUSTOMER MODAL --- */}
      {showAddModal && (
        <div className="search-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="search-modal" onClick={e => e.stopPropagation()}>
            <h3>Add New Customer</h3>
            <form onSubmit={handleAddCustomer} className="search-inputs">
              <div className="search-input-group">
                <label>Customer Name *</label>
                <input 
                  autoFocus
                  value={newCust.name} 
                  onChange={e => setNewCust({...newCust, name: e.target.value})} 
                  placeholder="e.g. Masaladhar Tadaka restaurant"
                  required
                />
              </div>
              <div className="search-input-group">
                <label>Address</label>
                <input 
                  value={newCust.address} 
                  onChange={e => setNewCust({...newCust, address: e.target.value})} 
                  placeholder="e.g. M6 Velachery Chennai"
                />
              </div>
              
              <div className="search-buttons" style={{ marginTop: "10px" }}>
                <button type="button" className="action-btn outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary" disabled={adding}>
                  {adding ? "Adding..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="toast-notification" role="status" aria-live="polite">
          <div className="toast-content">
            <div className={`toast-icon ${toast.type}`}>
              {toast.type === "success" ? "✓" : "!"}
            </div>
            <div className="toast-text">{toast.text}</div>
            <button onClick={() => setToast((t) => ({ ...t, show: false }))} className="toast-close">×</button>
          </div>
        </div>
      )}
    </div>
  );
}