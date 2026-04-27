import React, { useEffect, useState, startTransition, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
    // 🔥 Client-Side Caching
    // If Redux already has the bills in memory, DO NOT hit the database!
    if (savedBills && savedBills.length > 0) {
      return; 
    }
    dispatch(fetchSavedBills());
  }, [dispatch, savedBills]);

  const handleNewBill = () => {
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

  // 🔥 THE EXPERT MOBILE FIX: Single-Pass O(n) Memorization
  const { todaysRevenue, todaysBillsCount, recentBills } = useMemo(() => {
    if (!savedBills || savedBills.length === 0) {
      return { todaysRevenue: 0, todaysBillsCount: 0, recentBills: [] };
    }

    const todayObj = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(todayObj.getDate() - 30);
    
    const cutoffDateStr = thirtyDaysAgo.toISOString().slice(0, 10);
    const todayStr = todayObj.toISOString().slice(0, 10);

    let revenue = 0;
    let todayCount = 0;
    const recent30 = [];

    // Looping through the array ONCE is infinitely faster for mobile CPUs
    for (let i = 0; i < savedBills.length; i++) {
      const b = savedBills[i];
      const bDate = String(b.billDate || b.date).slice(0, 10);

      if (bDate >= cutoffDateStr) {
        recent30.push(b);
        
        if (bDate === todayStr) {
          todayCount++;
          revenue += Number(b.totalAmount || b.total || 0);
        }
      }
    }

    return {
      todaysRevenue: revenue,
      todaysBillsCount: todayCount,
      recentBills: recent30.slice(0, 3) 
    };
  }, [savedBills]);

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
          <button className="sidebar-link-btn" onClick={() => { setIsMenuOpen(false); startTransition(() => navigate("/customers")); }}>
            <span className="sidebar-icon">👥</span> Customers
          </button>
          <button className="sidebar-link-btn" onClick={() => { setIsMenuOpen(false); startTransition(() => navigate("/saved-bills")); }}>
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
              <p className="stat-value">{todaysBillsCount}</p>
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