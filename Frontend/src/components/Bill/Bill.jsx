import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  setBillNo,
  setDate,
  setCustomerId,
  setCustomerName,
  setCustomerAddress,
  updateItem,
  resetBill,
  toggleShare,
  toggleMenu,
  openSearch,
  closeSearch,
  saveBillToDB,
  fetchSavedBills,
  fetchCustomerById,
  searchBillsFromDB,
  setSearchBillNo,
  setSearchCustomerId,
  setSearchFromDate,
  setSearchToDate,
  setEditId,
  clearEditId,
  updateBillToDB
} from "../../slice/billSlice";
import "./bill.css";

function Bill() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    billNo,
    date,
    customerId,
    customerName,
    customerAddress,
    items,
    showShareDropdown,
    showMenuDropdown,
    showSearchModal,
    searchBillNo,
    searchCustomerId,
    searchFromDate,
    searchToDate,
    searchResults,
    loading,
    editId,
    savedBills
  } = useSelector((state) => state.bill);

  const inputRefs = useRef([]);
  const shareButtonRef = useRef(null);
  const menuButtonRef = useRef(null);
  const billPaperRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [searchMonth, setSearchMonth] = useState("");

  // ✅ inline toast (no new files)
  const [toast, setToast] = useState({ show: false, type: "success", text: "" });
  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  };

  const nextBillNoFromList = (list) => {
    const maxNo = (list || []).reduce((mx, b) => {
      const n = parseInt(String(b?.billNo ?? "").replace(/\D/g, ""), 10);
      return Number.isFinite(n) ? Math.max(mx, n) : mx;
    }, 0);
    return String(maxNo + 1).padStart(3, "0");
  };

  // ===== HOME LOAD / RELOAD RULE =====
  // - If location.state.editBill -> load for edit
  // - Else ALWAYS start fresh new bill with next billNo from DB (max+1)
  useEffect(() => {
    const run = async () => {
      // customers
      fetch("http://localhost:5000/api/bills/customers/all")
        .then((r) => r.json())
        .then((d) => setCustomers(Array.isArray(d) ? d : []))
        .catch(() => setCustomers([]));

      // edit flow
      const editBill = location.state?.editBill;
      if (editBill) {
        dispatch(setEditId(editBill.id));
        loadBill(editBill);
        navigate(".", { replace: true, state: {} });
        return;
      }

      // always exit edit mode on home load/reload
      dispatch(clearEditId());

      // fetch bills, compute next bill number
      let list = [];
      try {
        const payload = await dispatch(fetchSavedBills()).unwrap();
        list = Array.isArray(payload) ? payload : [];
      } catch {
        list = Array.isArray(savedBills) ? savedBills : [];
      }

      const nextNo = nextBillNoFromList(list);

      // start new bill state
      dispatch(resetBill());
      dispatch(setBillNo(nextNo));

      // clear route state (goHome etc.)
      if (location.state) navigate(".", { replace: true, state: {} });
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareButtonRef.current && !shareButtonRef.current.contains(event.target)) {
        dispatch(toggleShare(false));
      }
      if (menuButtonRef.current && !menuButtonRef.current.contains(event.target)) {
        dispatch(toggleMenu(false));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dispatch]);

  const total = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0),
    0
  );

  const handleItemChange = (index, field, value) => {
    dispatch(updateItem({ index, field, value }));
    const lastItem = items[items.length - 1] || {};
    if (index === items.length - 1 && (lastItem.name || lastItem.qty || lastItem.price)) {
      dispatch(updateItem({ index: items.length, field: "name", value: "" }));
      dispatch(updateItem({ index: items.length, field: "qty", value: "" }));
      dispatch(updateItem({ index: items.length, field: "price", value: "" }));
    }
  };

  const handleKeyDown = (e, index, field) => {
    const colMap = { name: 0, qty: 1, price: 2 };
    const col = colMap[field];
    let newIndex = index;
    let newCol = col;

    if (e.key === "ArrowUp") newIndex = Math.max(0, index - 1);
    else if (e.key === "ArrowDown") newIndex = Math.min(items.length - 1, index + 1);
    else if (e.key === "ArrowLeft") newCol = Math.max(0, col - 1);
    else if (e.key === "ArrowRight") newCol = Math.min(2, col + 1);
    else return;

    const refIndex = newIndex * 3 + newCol;
    if (inputRefs.current[refIndex]) inputRefs.current[refIndex].focus();
    e.preventDefault();
  };

  const toDisplayDate = (v) => {
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [yyyy, mm, dd] = v.split("-");
      return `${dd}-${mm}-${yyyy}`;
    }
    return v;
  };

  const toStoreDate = (v) => {
    const s = String(v || "").trim();
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split("-");
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return s;
  };

  const [dateValue, setDateValue] = useState(toDisplayDate(date));
  const [typingDate, setTypingDate] = useState(false);

  useEffect(() => {
    if (!typingDate) setDateValue(toDisplayDate(date));
  }, [date, typingDate]);

  const commitDate = () => {
    dispatch(setDate(toStoreDate(dateValue)));
    setTypingDate(false);
  };

  const [toValue, setToValue] = useState(customerName || "");
  const [typingId, setTypingId] = useState(false);

  useEffect(() => {
    if (!typingId) setToValue(customerName || "");
  }, [customerName, typingId]);

  const commitToField = async () => {
    const v = String(toValue || "").trim();

    if (/^\d+$/.test(v)) {
      const idStr = v;
      dispatch(setCustomerId(idStr));
      try {
        const payload = await dispatch(fetchCustomerById(idStr)).unwrap();
        if (payload) {
          dispatch(setCustomerName(payload.customerName || ""));
          dispatch(setCustomerAddress(payload.customerAddress || ""));
          setToValue(payload.customerName || "");
          setTypingId(false);
          return {
            customerId: String(payload.id ?? idStr),
            customerName: payload.customerName || "",
            customerAddress: payload.customerAddress || ""
          };
        }
        dispatch(setCustomerName("NO"));
        dispatch(setCustomerAddress(""));
        setToValue("NO");
        setTypingId(false);
        return { customerId: idStr, customerName: "NO", customerAddress: "" };
      } catch {
        dispatch(setCustomerName("NO"));
        dispatch(setCustomerAddress(""));
        setToValue("NO");
        setTypingId(false);
        return { customerId: idStr, customerName: "NO", customerAddress: "" };
      }
    }

    dispatch(setCustomerName(v));
    setTypingId(false);
    return {
      customerId: String(customerId || "").replace(/\D/g, ""),
      customerName: v,
      customerAddress
    };
  };

  const numberToWords = (value) => {
    const amt = Number(value || 0);
    if (!amt) return "Zero Rupees Only";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen"
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const below1000 = (n) => {
      let s = "";
      if (n >= 100) {
        s += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        s += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }
      if (n > 0) s += ones[n] + " ";
      return s.trim();
    };

    let n = Math.floor(amt);
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const rest = n;

    let words = "";
    if (crore) words += below1000(crore) + " Crore ";
    if (lakh) words += below1000(lakh) + " Lakh ";
    if (thousand) words += below1000(thousand) + " Thousand ";
    if (rest) words += below1000(rest);

    return `${words.trim()} Rupees Only`;
  };

  // ===== IMAGE/PDF GENERATION =====
  const renderBillCanvas = async () => {
    const el = billPaperRef.current;
    if (!el) throw new Error("Bill not found");
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true
    });
    return canvas;
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const downloadBillPNG = async () => {
    const canvas = await renderBillCanvas();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (blob) downloadBlob(blob, `Bill-${billNo}.png`);
  };

  const downloadBillPDF = async () => {
    const canvas = await renderBillCanvas();
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
    } else {
      let remaining = imgH;
      let position = 0;
      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
        remaining -= pageH;
        position -= pageH;
        if (remaining > 0) pdf.addPage();
      }
    }

    const blob = pdf.output("blob");
    downloadBlob(blob, `Bill-${billNo}.pdf`);
  };

  const shareBillAsImage = async () => {
    const canvas = await renderBillCanvas();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) return;

    const file = new File([blob], `Bill-${billNo}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `Bill ${billNo}`,
        text: `Bill ${billNo}`,
        files: [file]
      });
      return;
    }

    await downloadBillPNG();
  };

  const emailSubject = `Bill ${billNo} - VISHNU MARKETING CO.`;
  const emailBody = `Attached: Bill ${billNo}.\n\n(If not attached automatically, please attach the downloaded file.)`;

  const handleEmailPNG = async () => {
    try {
      await downloadBillPNG();
      window.location.href =
        `mailto:?subject=${encodeURIComponent(emailSubject)}` +
        `&body=${encodeURIComponent(emailBody)}`;
    } finally {
      dispatch(toggleShare(false));
    }
  };

  const handleEmailPDF = async () => {
    try {
      await downloadBillPDF();
      window.location.href =
        `mailto:?subject=${encodeURIComponent(emailSubject)}` +
        `&body=${encodeURIComponent(emailBody)}`;
    } finally {
      dispatch(toggleShare(false));
    }
  };

  // ===== SAVE / UPDATE =====
  const handleSave = async () => {
    commitDate();
    const resolved = await commitToField();
    const cid = String(resolved.customerId || customerId || "").replace(/\D/g, "");

    const billData = {
      billNo,
      billDate: toStoreDate(dateValue?.trim() || toDisplayDate(date)),
      customerId: cid,
      customerName: resolved.customerName || customerName,
      customerAddress: resolved.customerAddress || customerAddress,
      items: items.filter((item) => item.name || item.qty || item.price),
      totalAmount: total
    };

    // UPDATE (no new bill no)
    if (editId) {
      const action = await dispatch(updateBillToDB({ id: editId, billData }));
      if (action.type.endsWith("/fulfilled")) {
        showToast("success", `Updated ✓ (Bill ${billNo})`);
        dispatch(clearEditId());
        dispatch(fetchSavedBills());
        dispatch(toggleMenu(false));
        navigate("/saved-bills");
      } else {
        showToast("error", "Update failed ✕");
      }
      return;
    }

    // SAVE (insert) -> go to saved bills
    const action = await dispatch(saveBillToDB(billData));
    if (action.type === "bill/saveBillToDB/fulfilled") {
      showToast("success", `Saved ✓ (Bill ${billNo})`);
      dispatch(fetchSavedBills());
      dispatch(toggleMenu(false));
      setTypingDate(false);
      setTypingId(false);
      navigate("/saved-bills");
    } else {
      showToast("error", "Save failed ✕");
    }
  };

  const handleReset = () => {
    dispatch(resetBill());
    dispatch(clearEditId());
    dispatch(toggleMenu(false));
    setTypingDate(false);
    setTypingId(false);
    showToast("info", "Reset");
  };

  const ymd = (d) => new Date(d).toISOString().slice(0, 10);

  const monthRange = (yyyyMm) => {
    if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return { from: "", to: "" };
    const [y, m] = yyyyMm.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    return { from: ymd(first), to: ymd(last) };
  };

  const todayRange = () => {
    const t = ymd(new Date());
    return { from: t, to: t };
  };

  const thisMonthRange = () => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: ymd(first), to: ymd(last) };
  };

  const lastMonthRange = () => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const last = new Date(d.getFullYear(), d.getMonth(), 0);
    return { from: ymd(first), to: ymd(last) };
  };

  const handleSearch = () => {
    let from = searchFromDate || "";
    let to = searchToDate || "";

    if (searchMonth) {
      const r = monthRange(searchMonth);
      from = r.from;
      to = r.to;
      dispatch(setSearchFromDate(from));
      dispatch(setSearchToDate(to));
    }

    if (from && to && from > to) {
      const tmp = from;
      from = to;
      to = tmp;
      dispatch(setSearchFromDate(from));
      dispatch(setSearchToDate(to));
    }

    dispatch(
      searchBillsFromDB({
        billNo: searchBillNo,
        customerId: searchCustomerId,
        fromDate: from || null,
        toDate: to || null
      })
    );
  };

  const getCustomerLabel = (id) => {
    const c = customers.find((x) => x.id === Number(id));
    return c ? `${c.customerName} — ${c.customerAddress}` : "";
  };

  const loadBill = (bill) => {
    const billItems = bill.billTable || bill.items || [];

    dispatch(setBillNo(bill.billNo || ""));
    dispatch(setDate(String(bill.billDate || bill.date || "").slice(0, 10)));
    dispatch(setCustomerId(String(bill.customerId || "")));
    dispatch(setCustomerName(bill.customerName || ""));
    dispatch(setCustomerAddress(bill.customerAddress || ""));

    const paddedItems = [
      ...billItems.map((x) => ({
        name: x.name || "",
        qty: x.qty || "",
        price: x.price || ""
      })),
      ...Array.from({ length: Math.max(0, 30 - billItems.length) }, () => ({
        name: "",
        qty: "",
        price: ""
      }))
    ];

    paddedItems.forEach((item, idx) => {
      dispatch(updateItem({ index: idx, field: "name", value: item.name }));
      dispatch(updateItem({ index: idx, field: "qty", value: item.qty }));
      dispatch(updateItem({ index: idx, field: "price", value: item.price }));
    });

    dispatch(closeSearch());
  };

  const handleSavedBills = () => {
    dispatch(toggleMenu(false));
    navigate("/saved-bills");
  };

  const handleCustomers = () => {
    dispatch(toggleMenu(false));
    navigate("/customers");
  };

  const handlePrint = () => {
    window.print();
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  const hasSearchInput =
    searchBillNo || searchCustomerId || searchFromDate || searchToDate || searchMonth;

  return (
    <div className="bill-wrapper">
      <div className="bill-actions">
        <div className="menu-container" ref={menuButtonRef}>
          <button onClick={() => dispatch(toggleMenu(!showMenuDropdown))}>Menu</button>
          {showMenuDropdown && (
            <div className="menu-dropdown">
              <button onClick={handleReset}>Reset</button>
              <button onClick={handleSave}>{editId ? "Update" : "Save"}</button>
              <button onClick={handleSavedBills}>Saved Bills</button>
              <button onClick={handleCustomers}>Customers</button>
              <button
                onClick={() => {
                  dispatch(toggleMenu(false));
                  onLogout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <button onClick={handlePrint}>Print</button>
        <button onClick={() => dispatch(openSearch())}>Search</button>

        <div className="share-container" ref={shareButtonRef}>
          <button onClick={() => dispatch(toggleShare(!showShareDropdown))}>Share</button>
          {showShareDropdown && (
            <div className="share-dropdown">
              <button onClick={handleEmailPNG}>Email (PNG)</button>
              <button onClick={handleEmailPDF}>Email (PDF)</button>

              <button
                onClick={async () => {
                  try {
                    await shareBillAsImage(); // mobile share or download PNG
                  } catch {
                    showToast("error", "Share failed ✕");
                  } finally {
                    dispatch(toggleShare(false));
                  }
                }}
              >
                WhatsApp (Image)
              </button>

              <button
                onClick={async () => {
                  try {
                    await downloadBillPDF(); // download PDF, attach in WhatsApp
                  } catch {
                    showToast("error", "PDF failed ✕");
                  } finally {
                    dispatch(toggleShare(false));
                  }
                }}
              >
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bill-paper" ref={billPaperRef}>
        <h1 className="bill-title">CASH / CREDIT BILL</h1>
        <h1 className="shop-name">VISHNU MARKETING CO.</h1>
        <p className="shop-subtitle">
          Dealers in all kinds of Fresh Vegetables & Fruits <br />
          K-68, AU-15, Periyar Vegetable Market, Koyambedu, Chennai - 600 092
        </p>
        <div className="contact">Mobile : 9840338781 / 9952945707</div>

        <div className="bill-info-row">
          <div>
            <strong>Bill No.</strong> {billNo}
          </div>
          <div>
            <strong>Date</strong>{" "}
            <input
              type="text"
              className="editable-span"
              dir="ltr"
              value={dateValue}
              onChange={(e) => {
                setTypingDate(true);
                setDateValue(e.target.value.replace(/[^0-9-]/g, ""));
              }}
              onBlur={commitDate}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitDate();
                }
              }}
              placeholder="DD-MM-YYYY"
              style={{ border: "none", outline: "none", background: "transparent" }}
            />
          </div>
        </div>

        <div className="bill-info-row to-section">
          <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
            <strong style={{ whiteSpace: "nowrap" }}>To :</strong>

            <input
              type="text"
              className="editable-span"
              dir="ltr"
              value={toValue}
              onChange={(e) => {
                const v = e.target.value;
                setToValue(v);

                if (/^\d*$/.test(v.trim())) {
                  setTypingId(true);
                  dispatch(setCustomerId(v));
                  return;
                }

                setTypingId(false);
                dispatch(setCustomerName(v));
              }}
              onBlur={commitToField}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitToField();
                }
              }}
              placeholder="Customer / ID"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                flex: "0 1 280px",
                minWidth: "180px"
              }}
            />

            <span style={{ margin: 0, padding: 0, whiteSpace: "nowrap" }}>,</span>

            <input
              type="text"
              className="editable-span"
              dir="ltr"
              value={customerAddress}
              onChange={(e) => dispatch(setCustomerAddress(e.target.value))}
              placeholder="Address"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                flex: "1 1 auto",
                minWidth: "220px"
              }}
            />
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
            {items.map((item, index) => {
              const amount = (Number(item.qty) || 0) * (Number(item.price) || 0);
              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  {["name", "qty", "price"].map((field, colIdx) => (
                    <td key={field}>
                      <input
                        type="text"
                        value={item[field]}
                        dir="ltr"
                        onChange={(e) => handleItemChange(index, field, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, field)}
                        ref={(el) => (inputRefs.current[index * 3 + colIdx] = el)}
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          textAlign: "left"
                        }}
                      />
                    </td>
                  ))}
                  <td>{amount > 0 ? amount.toFixed(2) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="total-section">
          <div>
            <div className="note-section">
              <strong>Note:</strong> We are Supplying Vegetables and Fruits only
              <br />
              GST NOT APPLICABLE
              <br />
            </div>
            Total in words: {numberToWords(total)}
          </div>
          <div className="total-amount">Total: ₹ {total.toFixed(2)}</div>
        </div>

        <p className="footer-sign">For VISHNU MARKETING CO.</p>
      </div>

      {showSearchModal && (
        <div className="search-modal-overlay">
          <div className="search-modal">
            <h3>Search Bills</h3>

            <div className="search-inputs">
              <div className="search-input-group">
                <label>Bill No:</label>
                <input
                  type="text"
                  value={searchBillNo}
                  onChange={(e) => dispatch(setSearchBillNo(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. 001"
                />
              </div>

              <div className="search-input-group">
                <label>Customer ID:</label>
                <input
                  type="text"
                  value={searchCustomerId}
                  onChange={(e) => dispatch(setSearchCustomerId(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. 1"
                />
                {searchCustomerId && (
                  <small style={{ color: "#555", marginTop: "2px", display: "block" }}>
                    {getCustomerLabel(searchCustomerId) || "Unknown customer"}
                  </small>
                )}
              </div>

              <div className="search-input-group">
                <label>Month:</label>
                <input
                  type="month"
                  value={searchMonth}
                  onChange={(e) => setSearchMonth(e.target.value)}
                />
                <small style={{ color: "#555", marginTop: "2px", display: "block" }}>
                  Selecting month auto-fills From/To
                </small>
              </div>

              <div className="search-input-group">
                <label>From Date:</label>
                <input
                  type="date"
                  value={searchFromDate}
                  onChange={(e) => {
                    setSearchMonth("");
                    dispatch(setSearchFromDate(e.target.value));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <div className="search-input-group">
                <label>To Date:</label>
                <input
                  type="date"
                  value={searchToDate}
                  onChange={(e) => {
                    setSearchMonth("");
                    dispatch(setSearchToDate(e.target.value));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <div className="search-input-group" style={{ gridColumn: "1 / -1" }}>
                <label>Quick:</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const r = todayRange();
                      setSearchMonth("");
                      dispatch(setSearchFromDate(r.from));
                      dispatch(setSearchToDate(r.to));
                    }}
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const r = thisMonthRange();
                      setSearchMonth("");
                      dispatch(setSearchFromDate(r.from));
                      dispatch(setSearchToDate(r.to));
                    }}
                  >
                    This Month
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const r = lastMonthRange();
                      setSearchMonth("");
                      dispatch(setSearchFromDate(r.from));
                      dispatch(setSearchToDate(r.to));
                    }}
                  >
                    Last Month
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchMonth("");
                      dispatch(setSearchBillNo(""));
                      dispatch(setSearchCustomerId(""));
                      dispatch(setSearchFromDate(""));
                      dispatch(setSearchToDate(""));
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="search-buttons">
              <button onClick={handleSearch} disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>
              <button onClick={() => dispatch(closeSearch())}>Close</button>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>
                  Results: {searchResults.length} bill{searchResults.length !== 1 ? "s" : ""} found
                </h4>
                <div className="results-list">
                  {searchResults.map((bill, index) => (
                    <div key={index} className="result-item" onClick={() => loadBill(bill)}>
                      <div>Bill No: {bill.billNo}</div>
                      <div>Customer: {bill.customerName} (ID: {bill.customerId})</div>
                      <div>
                        Date: {toDisplayDate(String(bill.billDate || bill.date || "").slice(0, 10))}
                      </div>
                      <div>Total: ₹{Number(bill.totalAmount ?? bill.total ?? 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && searchResults.length === 0 && hasSearchInput && (
              <p style={{ textAlign: "center", color: "#888", marginTop: "12px" }}>No bills found.</p>
            )}
          </div>
        </div>
      )}

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
                    : toast.type === "error"
                      ? "rgba(239,68,68,.18)"
                      : "rgba(59,130,246,.18)"
              }}
              aria-hidden="true"
            >
              {toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "i"}
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

export default Bill;