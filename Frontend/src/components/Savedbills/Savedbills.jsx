import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { 
  fetchSavedBills, clearEditId, openSearch, closeSearch, 
  searchBillsFromDB, setSearchBillNo, setSearchCustomerId, 
  setSearchFromDate, setSearchToDate 
} from "../../slice/billSlice";
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

const ymd = (d) => new Date(d).toISOString().slice(0, 10);

function SavedBills() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { 
    savedBills, loading, error, showSearchModal, searchBillNo, 
    searchCustomerId, searchFromDate, searchToDate, searchResults 
  } = useSelector((state) => state.bill);

  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [searchMonth, setSearchMonth] = useState("");

  const [toast, setToast] = useState({ show: false, type: "success", text: "" });
  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => { setToast((t) => ({ ...t, show: false })); }, 2200);
  };

  useEffect(() => {
    dispatch(fetchSavedBills());
    // Fetch customers so the search modal can show customer names based on ID
    fetch("https://vishnu-marketing-co.onrender.com/api/bills/customers/all")
      .then((r) => r.json())
      .then((d) => setCustomers(Array.isArray(d) ? d : []))
      .catch(() => setCustomers([]));
  }, [dispatch]);

  const onEdit = (bill) => {
    dispatch(closeSearch()); // Close modal if open
    navigate("/bill", { state: { editBill: bill } });
  };

  const onBackToDashboard = () => {
    dispatch(clearEditId());
    navigate("/dashboard", { replace: true });
  };

  const onDeleteConfirm = async (id) => {
    setDeletingId(id);
    setConfirmId(null);
    const action = await dispatch(deleteSavedBillFromDB(id));
    setDeletingId(null);
    if (action.type.endsWith("/fulfilled")) {
      showToast("success", "Bill Deleted");
      dispatch(fetchSavedBills());
      dispatch(fetchAllSavedBills());
    } else {
      showToast("error", "Delete failed");
    }
  };

  // --- Search Modal Helpers ---
  const monthRange = (yyyyMm) => {
    if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return { from: "", to: "" };
    const [y, m] = yyyyMm.split("-").map(Number);
    return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
  };
  const todayRange = () => { const t = ymd(new Date()); return { from: t, to: t }; };
  const thisMonthRange = () => { const d = new Date(); return { from: ymd(new Date(d.getFullYear(), d.getMonth(), 1)), to: ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }; };
  const lastMonthRange = () => { const d = new Date(); return { from: ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: ymd(new Date(d.getFullYear(), d.getMonth(), 0)) }; };

  const handleSearch = () => {
    let from = searchFromDate || ""; let to = searchToDate || "";
    if (searchMonth) { const r = monthRange(searchMonth); from = r.from; to = r.to; dispatch(setSearchFromDate(from)); dispatch(setSearchToDate(to)); }
    if (from && to && from > to) { const tmp = from; from = to; to = tmp; dispatch(setSearchFromDate(from)); dispatch(setSearchToDate(to)); }
    dispatch(searchBillsFromDB({ billNo: searchBillNo, customerId: searchCustomerId, fromDate: from || null, toDate: to || null }));
  };

  const getCustomerLabel = (id) => {
    const c = customers.find((x) => x.id === Number(id));
    return c ? `${c.customerName} — ${c.customerAddress}` : "";
  };

  const hasSearchInput = searchBillNo || searchCustomerId || searchFromDate || searchToDate || searchMonth;

  return (
    <div className="bill-app-container">
      {/* Action Bar */}
      <div className="bill-action-bar">
        <button className="action-btn outline" onClick={onBackToDashboard}>
          ← Back
        </button>
        {/* We brought the Search button here! */}
        <button className="action-btn primary" onClick={() => dispatch(openSearch())}>
          🔍 Search Bills
        </button>
      </div>

      {/* Main Content */}
      <div className="saved-bills-content">
        <div className="page-header">
          <h2>Saved Bills</h2>
          <p>Manage and review your past transactions</p>
        </div>

        {loading && !showSearchModal && <div className="loading-state">Loading bills...</div>}
        {error && <div className="error-state">{String(error)}</div>}
        
        {!loading && (!savedBills || savedBills.length === 0) && !showSearchModal && (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>No saved bills found yet.</p>
          </div>
        )}

        <div className="bills-grid">
          {(savedBills || []).map((bill, index) => {
            const billDate = ymdToDmy(bill.billDate || bill.date || "");
            const total = Number(bill.totalAmount ?? bill.total ?? 0);
            const isConfirming = confirmId === bill.id;
            const isDeleting = deletingId === bill.id;
            const customerLine = [(bill.customerName || "").trim(), (bill.customerAddress || "").trim()].filter(Boolean).join(", ");

            return (
              <div key={bill.id ?? index} className="bill-card" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="bill-card-header">
                  <span className="bill-card-no">#{bill.billNo}</span>
                  <span className="bill-card-date">{billDate}</span>
                </div>
                <div className="bill-card-body">
                  <div className="bill-card-customer">
                    <span className="icon">👤</span> {customerLine || bill.customerName || "Unknown Customer"}
                  </div>
                  <div className="bill-card-total">₹{total.toFixed(2)}</div>
                </div>
                <div className="bill-card-actions">
                  <button className="card-btn edit" onClick={() => onEdit(bill)} disabled={isDeleting || isConfirming}>
                    ✏️ Edit / View
                  </button>
                  {!isConfirming ? (
                    <button className="card-btn delete" onClick={() => setConfirmId(bill.id)} disabled={isDeleting}>🗑️ Delete</button>
                  ) : (
                    <div className="card-confirm-actions">
                      <span className="confirm-msg">Sure?</span>
                      <button className="card-btn confirm-yes" onClick={() => onDeleteConfirm(bill.id)} disabled={isDeleting}>{isDeleting ? "..." : "Yes"}</button>
                      <button className="card-btn confirm-no" onClick={() => setConfirmId(null)}>No</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- SEARCH MODAL (Ported from Bill.jsx) --- */}
      {showSearchModal && (
        <div className="search-modal-overlay">
          <div className="search-modal">
            <h3>Search Bills</h3>
            <div className="search-inputs">
              <div className="search-input-group">
                <label>Bill No:</label>
                <input type="text" value={searchBillNo} onChange={(e) => dispatch(setSearchBillNo(e.target.value))} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="e.g. 001" />
              </div>
              <div className="search-input-group">
                <label>Customer ID:</label>
                <input type="text" value={searchCustomerId} onChange={(e) => dispatch(setSearchCustomerId(e.target.value))} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="e.g. 1" />
                {searchCustomerId && <small className="helper-text">{getCustomerLabel(searchCustomerId) || "Unknown customer"}</small>}
              </div>
              <div className="search-input-group">
                <label>Month:</label>
                <input type="month" value={searchMonth} onChange={(e) => setSearchMonth(e.target.value)} />
              </div>
              <div className="search-input-group">
                <label>From Date:</label>
                <input type="date" value={searchFromDate} onChange={(e) => { setSearchMonth(""); dispatch(setSearchFromDate(e.target.value)); }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
              </div>
              <div className="search-input-group">
                <label>To Date:</label>
                <input type="date" value={searchToDate} onChange={(e) => { setSearchMonth(""); dispatch(setSearchToDate(e.target.value)); }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
              </div>
              <div className="search-input-group quick-filters">
                <label>Quick:</label>
                <div className="quick-btn-group">
                  <button type="button" onClick={() => { const r = todayRange(); setSearchMonth(""); dispatch(setSearchFromDate(r.from)); dispatch(setSearchToDate(r.to)); }}>Today</button>
                  <button type="button" onClick={() => { const r = thisMonthRange(); setSearchMonth(""); dispatch(setSearchFromDate(r.from)); dispatch(setSearchToDate(r.to)); }}>This Month</button>
                  <button type="button" onClick={() => { const r = lastMonthRange(); setSearchMonth(""); dispatch(setSearchFromDate(r.from)); dispatch(setSearchToDate(r.to)); }}>Last Month</button>
                  <button type="button" onClick={() => { setSearchMonth(""); dispatch(setSearchBillNo("")); dispatch(setSearchCustomerId("")); dispatch(setSearchFromDate("")); dispatch(setSearchToDate("")); }}>Clear</button>
                </div>
              </div>
            </div>

            <div className="search-buttons">
              <button className="primary" onClick={handleSearch} disabled={loading}>{loading ? "Searching..." : "Search"}</button>
              <button className="outline" onClick={() => dispatch(closeSearch())}>Close</button>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>Results: {searchResults.length} bill{searchResults.length !== 1 ? "s" : ""} found</h4>
                <div className="results-list">
                  {searchResults.map((bill, index) => (
                    <div key={index} className="result-item" onClick={() => onEdit(bill)}>
                      <div><strong>Bill No: {bill.billNo}</strong></div>
                      <div>Customer: {bill.customerName} (ID: {bill.customerId})</div>
                      <div>Date: {String(bill.billDate || bill.date || "").slice(0, 10).split('-').reverse().join('-')}</div>
                      <div className="result-total">Total: ₹{Number(bill.totalAmount ?? bill.total ?? 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!loading && searchResults.length === 0 && hasSearchInput && (<p className="no-results">No bills found.</p>)}
          </div>
        </div>
      )}

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

export default SavedBills;