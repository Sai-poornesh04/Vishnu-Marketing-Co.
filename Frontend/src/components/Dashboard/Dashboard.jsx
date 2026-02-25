import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchSavedBills, resetBill, clearEditId } from "../../slice/billSlice";
import "./dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { savedBills, loading } = useSelector((state) => state.bill);

  // Fetch bills on mount to populate the "Latest Bills" and "Stats"
  useEffect(() => {
    dispatch(fetchSavedBills());
  }, [dispatch]);

  const handleNewBill = () => {
    dispatch(resetBill());
    dispatch(clearEditId());
    navigate("/bill");
  };

  // Calculate quick stats
  const today = new Date().toISOString().slice(0, 10);
  const todaysBills = (savedBills || []).filter(
    (b) => String(b.billDate || b.date).slice(0, 10) === today
  );
  const todaysRevenue = todaysBills.reduce(
    (sum, b) => sum + Number(b.totalAmount || b.total || 0),
    0
  );

  // Get 3 most recent bills
  const recentBills = (savedBills || []).slice(0, 3);

  const onLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  return (
    <div className="dash-container">
      {/* Animated Background Orbs */}
      <div className="dash-bg-orbs" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      <div className="dash-nav">
        <div className="dash-brand">
          <div className="brand-logo">VM</div>
          <span>Vishnu Marketing Co.</span>
        </div>
        <button className="dash-logout" onClick={onLogout}>Logout</button>
      </div>

      <div className="dash-content">
        <header className="dash-header staggered-1">
          <h1>Welcome back, Admin</h1>
          <p>Here is what's happening with your business today.</p>
        </header>

        {/* --- Quick Stats --- */}
        <div className="dash-stats-grid staggered-2">
          <div className="stat-card glass-panel hover-3d">
            <div className="stat-icon revenue">₹</div>
            <div className="stat-details">
              <h3>Today's Revenue</h3>
              <p className="stat-value">₹ {todaysRevenue.toFixed(2)}</p>
            </div>
          </div>
          <div className="stat-card glass-panel 3d-hover">
            <div className="stat-icon count">📄</div>
            <div className="stat-details">
              <h3>Bills Today</h3>
              <p className="stat-value">{todaysBills.length}</p>
            </div>
          </div>
        </div>

        {/* --- Core Actions --- */}
        <h2 className="section-title staggered-3">Quick Actions</h2>
        <div className="dash-actions-grid staggered-4">
          <button className="action-card primary-card 3d-hover" onClick={handleNewBill}>
            <div className="action-icon">➕</div>
            <h3>Create New Bill</h3>
            <p>Generate a fresh cash/credit bill</p>
          </button>

          <button className="action-card glass-panel 3d-hover" onClick={() => navigate("/saved-bills")}>
            <div className="action-icon">📂</div>
            <h3>Saved Bills</h3>
            <p>View, edit, or print past bills</p>
          </button>

          <button className="action-card glass-panel 3d-hover" onClick={() => navigate("/customers")}>
            <div className="action-icon">👥</div>
            <h3>Customers</h3>
            <p>Manage your client database</p>
          </button>
        </div>

        {/* --- Recent Bills --- */}
        <h2 className="section-title staggered-5">Latest Bills</h2>
        <div className="recent-bills-list staggered-6 glass-panel">
          {loading ? (
            <p className="muted-text">Loading latest transactions...</p>
          ) : recentBills.length > 0 ? (
            recentBills.map((bill, idx) => (
              <div key={bill.id || idx} className="recent-bill-row" onClick={() => navigate("/saved-bills")}>
                <div className="r-bill-left">
                  <span className="r-bill-no">#{bill.billNo}</span>
                  <div className="r-bill-info">
                    <strong>{bill.customerName || "Walk-in Customer"}</strong>
                    <span>{String(bill.billDate || bill.date).slice(0, 10)}</span>
                  </div>
                </div>
                <div className="r-bill-right">
                  <strong>₹ {Number(bill.totalAmount || bill.total || 0).toFixed(2)}</strong>
                  <span className="chevron">›</span>
                </div>
              </div>
            ))
          ) : (
            <p className="muted-text">No bills generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;