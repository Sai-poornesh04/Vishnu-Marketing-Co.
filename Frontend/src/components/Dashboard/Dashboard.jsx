import React, { useEffect, useState, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
// 1. Reverted to fetchSavedBills so it doesn't collide with the Search Modal
import { fetchSavedBills, resetBill, clearEditId } from "../../slice/billSlice";
import "./dashboard.css";
import logo from "../../assets/VM-logo.png";

function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Pulling the main savedBills array from Redux memory
  const { savedBills, loading } = useSelector((state) => state.bill);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // 🔥 THE FIX: Client-Side Caching
    // If Redux already has the bills in memory, DO NOT hit the database!
    // This stops the re-fetching on the Back button. It will only fetch on a hard reload.
    if (savedBills && savedBills.length > 0) {
      return; 
    }

    dispatch(fetchSavedBills());
  }, [dispatch, savedBills]);

  const handleNewBill = () => {
    // startTransition keeps the button tap instant without freezing the UI
    startTransition(() => {
      dispatch(resetBill());
      dispatch(clearEditId());
      navigate("/bill");
    });
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  // 🔥 CPU OPTIMIZATION: Even if Redux holds 5,000 bills in memory, 
  // we only slice out the last 30 days to do our math on, keeping the phone lightning fast.
  const todayObj = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(todayObj.getDate() - 30);
  const cutoffDateStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const recent30DaysBills = (savedBills || []).filter(b => {
     const bDate = String(b.billDate || b.date).slice(0, 10);
     return bDate >= cutoffDateStr;
  });

  const todayStr = todayObj.toISOString().slice(0, 10);
  const todaysBills = recent30DaysBills.filter(
    (b) => String(b.billDate || b.date).slice(0, 10) === todayStr
  );
  
  const todaysRevenue = todaysBills.reduce(
    (sum, b) => sum + Number(b.totalAmount || b.total || 0),
    0
  );

  const recentBills = recent30DaysBills.slice(0, 3);

  return (
    <div className="dash-container">
      {/* Dynamic Background */}
      <div className="dash-bg-orbs" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* --- Sidebar Menu --- */}
      {isMenuOpen && <div className="sidebar-overlay" onClick={() => setIsMenuOpen(false)}></div>}
      <div className={`sidebar-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-user-info">
            <div className="user-avatar-circle">HR</div>
            <div>
              <h3 className="user-name">Hazarath Reddy</h3>
              <p className="user-role">Administrator</p>
            </div>
          </div>
          <button className="close-sidebar-btn" onClick={() => setIsMenuOpen(false)}>×</button>
        </div>

        <div className="sidebar-links">
          <button className="sidebar-link-btn" onClick={() => setIsMenuOpen(false)}>
            <span className="sidebar-icon">👤</span> Profile
          </button>
          <button className="sidebar-link-btn" onClick={() => { setIsMenuOpen(false); navigate("/customers"); }}>
            <span className="sidebar-icon">👥</span> Customers
          </button>
          <button className="sidebar-link-btn" onClick={() => { setIsMenuOpen(false); navigate("/saved-bills"); }}>
            <span className="sidebar-icon">📂</span> Saved Bills
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <span className="sidebar-icon">🚪</span> Logout
          </button>
        </div>
      </div>

      {/* --- Top Navigation --- */}
      <div className="dash-nav staggered-0">
        <div className="dash-brand" onClick={() => navigate("/dashboard")}>
          <img src={logo} alt="VM Logo" className="brand-logo-img" />
          <span>Vishnu Marketing Co.</span>
        </div>
        
        <button className="user-profile-toggle" onClick={() => setIsMenuOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>
      </div>

      <div className="dash-content">
        {/* --- Animated Header --- */}
        <header className="dash-header staggered-1">
          <h1 className="animated-gradient-text">Welcome, Reddy</h1>
          <p>Here is what's happening with your business today.</p>
        </header>

        {/* --- Quick Stats --- */}
        <div className="dash-stats-grid staggered-2">
           <div className="stat-card glass-panel premium-hover">
            <div className="card-glow"></div>
            <div className="stat-icon revenue levitate">₹</div>
            <div className="stat-details">
              <h3>Today's Revenue</h3>
              <p className="stat-value">₹ {todaysRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          
          <div className="stat-card glass-panel premium-hover">
            <div className="card-glow"></div>
            <div className="stat-icon count levitate-delay">📄</div>
            <div className="stat-details">
              <h3>Bills Today</h3>
              <p className="stat-value">{todaysBills.length}</p>
            </div>
          </div>
        </div>

        {/* --- Core Actions --- */}
        <h2 className="section-title staggered-3">Quick Actions</h2>
        <div className="dash-actions-grid staggered-4">
          <div role="button" className="action-card primary-card premium-hover" onClick={handleNewBill}>
            <div className="light-sweep"></div>
            <div className="action-icon pop-in">➕</div>
            <h3>Create New Bill</h3>
            <p>Generate a fresh cash/credit bill</p>
          </div>

          <div role="button" className="action-card glass-panel premium-hover" onClick={() => startTransition(() => navigate("/saved-bills"))}>
            <div className="card-glow"></div>
            <div className="action-icon pop-in delay-1">📂</div>
            <h3>Saved Bills</h3>
            <p>View, edit, or print past bills</p>
          </div>

          <div role="button" className="action-card glass-panel premium-hover" onClick={() => startTransition(() => navigate("/customers"))}>
            <div className="card-glow"></div>
            <div className="action-icon pop-in delay-2">👥</div>
            <h3>Customers</h3>
            <p>Manage your client database</p>
          </div>
        </div>

        {/* --- Recent Bills --- */}
        <h2 className="section-title staggered-5">Latest Bills</h2>
        <div className="recent-bills-list staggered-6 glass-panel premium-hover">
          {loading && (!savedBills || savedBills.length === 0) ? (
            <p className="muted-text pulse">Loading latest transactions...</p>
          ) : recentBills.length > 0 ? (
            recentBills.map((bill, idx) => (
              <div key={bill.id || idx} className="recent-bill-row" onClick={() => startTransition(() => navigate("/saved-bills"))}>
                <div className="r-bill-left">
                  <span className="r-bill-no">#{bill.billNo}</span>
                  <div className="r-bill-info">
                    <strong>{bill.customerName || "Walk-in Customer"}</strong>
                    <span>{String(bill.billDate || bill.date).slice(0, 10)}</span>
                  </div>
                </div>
                <div className="r-bill-right">
                  <strong>₹ {Number(bill.totalAmount || bill.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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