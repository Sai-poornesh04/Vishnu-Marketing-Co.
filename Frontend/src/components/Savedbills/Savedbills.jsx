import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchSavedBills, clearEditId } from "../../slice/billSlice";
import { deleteSavedBillFromDB, fetchAllSavedBills } from "../../slice/savedBillsSlice";
import "../Bill/bill.css";

const ymdToDmy = (v) => {
  const s = String(v || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}-${m}-${y}`;
  }
  return s;
};

function SavedBills() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { savedBills, loading, error } = useSelector((state) => state.bill);

  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ✅ inline toast (no new files)
  const [toast, setToast] = useState({ show: false, type: "success", text: "" });
  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  };

  useEffect(() => {
    dispatch(fetchSavedBills());
  }, [dispatch]);

  const onEdit = (bill) => {
    navigate("/bill", { state: { editBill: bill } });
  };

  // ✅ Back to Bill should NOT increment billNo
  // It should just leave edit mode and go home
  const onBackToBill = () => {
    dispatch(clearEditId());
    navigate("/bill", { replace: true, state: { goHome: true } });
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };
  const onDeleteConfirm = async (id) => {
    setDeletingId(id);
    setConfirmId(null);

    const action = await dispatch(deleteSavedBillFromDB(id));

    setDeletingId(null);

    if (action.type.endsWith("/fulfilled")) {
      showToast("success", "Deleted ✓");
      dispatch(fetchSavedBills());
      dispatch(fetchAllSavedBills());
    } else {
      showToast("error", "Delete failed ✕");
    }
  };

  return (
    <div className="bill-wrapper saved-bills-wrapper">
      <div className="saved-bills-header">
        <h2>Saved Bills</h2>
      </div>

      <div className="bill-actions">
        <button onClick={onBackToBill}>← Back to Bill</button>
        <button
          onClick={onLogout}
          style={{ marginLeft: 10 }}
        >
          Logout
        </button>
      </div>

      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}
      {error && <p style={{ textAlign: "center", color: "red" }}>{String(error)}</p>}

      {!loading && (!savedBills || savedBills.length === 0) && (
        <p style={{ textAlign: "center" }}>No saved bills found.</p>
      )}

      <div className="saved-bills-list">
        {(savedBills || []).map((bill, billIndex) => {
          const billItems = bill.billTable || bill.items || [];
          const billDate = ymdToDmy(bill.billDate || bill.date || "");
          const total = Number(bill.totalAmount ?? bill.total ?? 0);
          const isConfirming = confirmId === bill.id;
          const isDeleting = deletingId === bill.id;

          const customerLine = [(bill.customerName || "").trim(), (bill.customerAddress || "").trim()]
            .filter(Boolean)
            .join(" - ");

          return (
            <div key={bill.id ?? billIndex} className="saved-bill-item">
              <div className="bill-paper" >
                <div className="bill-info-row">
                  <div>
                    <strong>Bill No:</strong> {bill.billNo}
                  </div>
                  <div>
                    <strong>Date:</strong> {billDate}
                  </div>
                </div>

                <div className="bill-info-row">
                  <div>
                    <strong>Customer:</strong> {customerLine || bill.customerName}
                  </div>
                </div>

                <table className="bill-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Particulars</th>
                      <th>Kgs / Bunch</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(billItems || []).map((item, index) => {
                      const amount = (Number(item.qty) || 0) * (Number(item.price) || 0);
                      return (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{item.name}</td>
                          <td>{item.qty}</td>
                          <td>{item.price}</td>
                          <td>{amount ? amount.toFixed(2) : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="total-amount">Total: ₹ {total.toFixed(2)}</div>

                <div style={styles.actionBar}>
                  <button style={styles.editBtn} onClick={() => onEdit(bill)} disabled={isDeleting}>
                    ✏️ Edit
                  </button>

                  {!isConfirming ? (
                    <button
                      style={styles.deleteBtn}
                      onClick={() => setConfirmId(bill.id)}
                      disabled={isDeleting}
                    >
                      🗑️ Delete
                    </button>
                  ) : (
                    <div style={styles.confirmRow}>
                      <span style={styles.confirmText}>Delete this bill?</span>
                      <button
                        style={styles.confirmYes}
                        onClick={() => onDeleteConfirm(bill.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Yes, Delete"}
                      </button>
                      <button style={styles.confirmNo} onClick={() => setConfirmId(null)}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ inline toast */}
      {toast.show && (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 9999,
            maxWidth: 360,
            width: "calc(100% - 32px)"
          }}
          role="status"
          aria-live="polite"
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "12px 14px",
              borderRadius: 14,
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.14)"
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                background:
                  toast.type === "success"
                    ? "rgba(16,185,129,.18)"
                    : "rgba(239,68,68,.18)"
              }}
              aria-hidden="true"
            >
              {toast.type === "success" ? "✓" : "!"}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>
              {toast.text}
            </div>

            <button
              onClick={() => setToast((t) => ({ ...t, show: false }))}
              style={{
                marginLeft: "auto",
                border: "none",
                background: "transparent",
                fontSize: 18,
                cursor: "pointer",
                opacity: 0.6
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  actionBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid #e2e8f0",
    flexWrap: "wrap"
  },
  editBtn: {
    padding: "8px 20px",
    background: "#ebf8ff",
    border: "1px solid #90cdf4",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    color: "#2b6cb0"
  },
  deleteBtn: {
    padding: "8px 20px",
    background: "#fff5f5",
    border: "1px solid #feb2b2",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    color: "#c53030"
  },
  confirmRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap"
  },
  confirmText: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#c53030"
  },
  confirmYes: {
    padding: "7px 16px",
    background: "#c53030",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    color: "#fff"
  },
  confirmNo: {
    padding: "7px 16px",
    background: "#e2e8f0",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    color: "#4a5568"
  }
};

export default SavedBills;