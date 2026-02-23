import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./customer.css";

const API = "http://localhost:5000/api/customers";

export default function Customers() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);

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
  }, []);

  const isDirty = (r) =>
    String(r.customerName ?? "") !== String(r._origName ?? "") ||
    String(r.customerAddress ?? "") !== String(r._origAddr ?? "");

  const onChange = (id, key, val) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  };

  const save = async (row) => {
    const name = String(row.customerName ?? "").trim();
    const addr = String(row.customerAddress ?? "").trim();

    if (!name) {
      setError("Customer name required");
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
    } catch (e) {
      setError(String(e.message || "Update failed"));
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    const dirty = rows.filter(isDirty);
    for (const r of dirty) {
      // eslint-disable-next-line no-await-in-loop
      await save(r);
    }
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

  const onBackToBill = () => {
    navigate("/bill", { replace: true, state: { goHome: true } });
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  return (
    <div className="customers-page">
      <div className="customers-card">
        <div className="customers-head">
          <h2 className="customers-title">Customers</h2>

          <div className="customers-tools">
            <button
              className="customers-btn back-to-bill"
              onClick={onBackToBill}
              disabled={loading || savingId != null}
              title="Back to Bill"
            >
              ← Back to Bill
            </button>
            <button className="customers-btn back-to-bill" onClick={onLogout}>
              Logout
            </button>

            <input
              className="customers-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ID / name / address"
            />

            <label className="customers-check">
              <input
                type="checkbox"
                checked={onlyChanged}
                onChange={(e) => setOnlyChanged(e.target.checked)}
              />
              Changed only
            </label>

            <button className="customers-btn" onClick={load} disabled={loading || savingId != null}>
              Refresh
            </button>

            <button
              className="customers-btn primary"
              onClick={saveAll}
              disabled={dirtyCount === 0 || savingId != null}
              title={dirtyCount ? `Save ${dirtyCount} changed` : "No changes"}
            >
              Save All ({dirtyCount})
            </button>
          </div>
        </div>

        {error ? <div className="customers-error">{error}</div> : null}
        {loading ? <div className="customers-info">Loading...</div> : null}

        <div className="customers-table-wrap">
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
              {filtered.map((r) => {
                const dirty = isDirty(r);
                return (
                  <tr key={r.id} className={dirty ? "row-dirty" : ""}>
                    <td className="col-id">{r.id}</td>

                    <td>
                      <input
                        className="customers-input"
                        value={r.customerName}
                        onChange={(e) => onChange(r.id, "customerName", e.target.value)}
                        placeholder="Customer name"
                      />
                    </td>

                    <td>
                      <input
                        className="customers-input"
                        value={r.customerAddress}
                        onChange={(e) => onChange(r.id, "customerAddress", e.target.value)}
                        placeholder="Customer address"
                      />
                    </td>

                    <td className="col-action">
                      <button
                        className="customers-btn"
                        onClick={() => save(r)}
                        disabled={!dirty || savingId === r.id}
                      >
                        {savingId === r.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="customers-empty">
                    No customers
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="customers-foot">
          <div>Total: {rows.length}</div>
          <div>Showing: {filtered.length}</div>
        </div>
      </div>
    </div>
  );
}