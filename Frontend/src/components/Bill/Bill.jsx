import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  setBillNo, setDate, setCustomerId, setCustomerName, setCustomerAddress,
  updateItem, resetBill, toggleShare, saveBillToDB, fetchSavedBills, fetchCustomerById,
  clearEditId, updateBillToDB, setEditId
} from "../../slice/billSlice";
import "./bill.css";

function Bill() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    billNo, date, customerId, customerName, customerAddress, items,
    showShareDropdown, editId, savedBills
  } = useSelector((state) => state.bill);

  const inputRefs = useRef([]);
  const shareButtonRef = useRef(null);
  const billPaperRef = useRef(null);

  const [toast, setToast] = useState({ show: false, type: "success", text: "" });

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  };

  // --- BULLETPROOF EDIT MODE CHECK ---
  // If Redux is lagging, we check the router's location state as a fallback!
  const editBillData = location.state?.editBill;
  const currentEditId = editId || editBillData?.id;
  const isEditMode = Boolean(currentEditId);

  const nextBillNoFromList = (list) => {
    const maxNo = (list || []).reduce((mx, b) => {
      const n = parseInt(String(b?.billNo ?? "").replace(/\D/g, ""), 10);
      return Number.isFinite(n) ? Math.max(mx, n) : mx;
    }, 0);
    return String(maxNo + 1).padStart(3, "0");
  };

  useEffect(() => {
    const run = async () => {
      if (editBillData) {
        dispatch(setEditId(editBillData.id));
        loadBill(editBillData);
        return; // Stop here, do not fetch a new bill number!
      }

      // If we are NOT editing, prepare a fresh bill
      dispatch(clearEditId());
      let list = [];
      try {
        const payload = await dispatch(fetchSavedBills()).unwrap();
        list = Array.isArray(payload) ? payload : [];
      } catch {
        list = Array.isArray(savedBills) ? savedBills : [];
      }

      const nextNo = nextBillNoFromList(list);
      dispatch(resetBill());
      dispatch(setBillNo(nextNo));
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, editBillData]); // Depend directly on the router state

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareButtonRef.current && !shareButtonRef.current.contains(event.target)) {
        dispatch(toggleShare(false));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dispatch]);

  const total = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);

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
          return { customerId: String(payload.id ?? idStr), customerName: payload.customerName || "", customerAddress: payload.customerAddress || "" };
        }
      } catch { }
      dispatch(setCustomerName("NO"));
      dispatch(setCustomerAddress(""));
      setToValue("NO");
      setTypingId(false);
      return { customerId: idStr, customerName: "NO", customerAddress: "" };
    }
    dispatch(setCustomerName(v));
    setTypingId(false);
    return { customerId: String(customerId || "").replace(/\D/g, ""), customerName: v, customerAddress };
  };

  const numberToWords = (value) => {
    const amt = Number(value || 0);
    if (!amt) return "Zero Rupees Only";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const below1000 = (n) => {
      let s = "";
      if (n >= 100) { s += ones[Math.floor(n / 100)] + " Hundred "; n %= 100; }
      if (n >= 20) { s += tens[Math.floor(n / 10)] + " "; n %= 10; }
      if (n > 0) s += ones[n] + " ";
      return s.trim();
    };
    let n = Math.floor(amt);
    const crore = Math.floor(n / 10000000); n %= 10000000;
    const lakh = Math.floor(n / 100000); n %= 100000;
    const thousand = Math.floor(n / 1000); n %= 1000;
    const rest = n;
    let words = "";
    if (crore) words += below1000(crore) + " Crore ";
    if (lakh) words += below1000(lakh) + " Lakh ";
    if (thousand) words += below1000(thousand) + " Thousand ";
    if (rest) words += below1000(rest);
    return `${words.trim()} Rupees Only`;
  };

  const renderBillCanvas = async () => {
    const el = billPaperRef.current;
    if (!el) throw new Error("Bill not found");
    return await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
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

    let imgW = pageW;
    let imgH = (canvas.height * imgW) / canvas.width;

    // 🔥 FORCE 1-PAGE CONSTRAINT 🔥
    // If the generated image height is taller than the A4 page, 
    // we scale both the height and width down to fit perfectly.
    if (imgH > pageH) {
      imgH = pageH;
      imgW = (canvas.width * pageH) / canvas.height;
    }

    // Center the bill horizontally if it was scaled down
    const xOffset = (pageW - imgW) / 2;

    pdf.addImage(imgData, "PNG", xOffset, 0, imgW, imgH);

    const blob = pdf.output("blob");
    downloadBlob(blob, `Bill-${billNo}.pdf`);
  };

  const shareBillAsImage = async () => {
    const canvas = await renderBillCanvas();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) return;
    const file = new File([blob], `Bill-${billNo}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `Bill ${billNo}`, text: `Bill ${billNo}`, files: [file] });
      return;
    }
    await downloadBillPNG();
  };

  const emailSubject = `Bill ${billNo} - VISHNU MARKETING CO.`;
  const emailBody = `Attached: Bill ${billNo}.\n\n(If not attached automatically, please attach the downloaded file.)`;

  const handleEmailPNG = async () => {
    try { await downloadBillPNG(); window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`; }
    finally { dispatch(toggleShare(false)); }
  };

  const handleEmailPDF = async () => {
    try { await downloadBillPDF(); window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`; }
    finally { dispatch(toggleShare(false)); }
  };

  // --- UPDATED SAVE HANDLER ---
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

    // Use our bulletproof isEditMode flag
    if (isEditMode) {
      const action = await dispatch(updateBillToDB({ id: currentEditId, billData }));
      if (action.type.endsWith("/fulfilled")) {
        showToast("success", `Updated ✓ (Bill ${billNo})`);
        // Navigate back to saved bills and clear the router state completely
        navigate("/saved-bills", { replace: true, state: {} });
      } else {
        showToast("error", "Update failed ✕");
      }
      return;
    }

    // Creating a NEW bill
    const action = await dispatch(saveBillToDB(billData));
    if (action.type === "bill/saveBillToDB/fulfilled") {
      showToast("success", `Saved ✓ (Bill ${billNo})`);
      setTypingDate(false);
      setTypingId(false);
      navigate("/saved-bills", { replace: true });
    } else {
      showToast("error", "Save failed ✕");
    }
  };

  const loadBill = (bill) => {
    const billItems = bill.billTable || bill.items || [];
    dispatch(setBillNo(bill.billNo || ""));
    dispatch(setDate(String(bill.billDate || bill.date || "").slice(0, 10)));
    dispatch(setCustomerId(String(bill.customerId || "")));
    dispatch(setCustomerName(bill.customerName || ""));
    dispatch(setCustomerAddress(bill.customerAddress || ""));

    // 🔥 UPDATED TO 40 ROWS
    const paddedItems = [
      ...billItems.map((x) => ({ name: x.name || "", qty: x.qty || "", price: x.price || "" })),
      ...Array.from({ length: Math.max(0, 40 - billItems.length) }, () => ({ name: "", qty: "", price: "" }))
    ];

    paddedItems.forEach((item, idx) => {
      dispatch(updateItem({ index: idx, field: "name", value: item.name }));
      dispatch(updateItem({ index: idx, field: "qty", value: item.qty }));
      dispatch(updateItem({ index: idx, field: "price", value: item.price }));
    });
  };

  const handlePrint = () => { window.print(); };

  return (
    <div className="bill-app-container">

      {/* Action Bar */}
      <div className="bill-action-bar">
        <button className="action-btn outline" onClick={() => navigate("/dashboard", { replace: true })}>
          ← Back
        </button>

        {/* Bulletproof button rendering */}
        <button className="action-btn primary" onClick={handleSave}>
          {isEditMode ? "💾 Update" : "💾 Save"}
        </button>

        <button className="action-btn outline" onClick={handlePrint}>
          🖨️ Print
        </button>

        <div className="share-container" ref={shareButtonRef}>
          <button className="action-btn outline" onClick={() => dispatch(toggleShare(!showShareDropdown))}>
            📤 Share
          </button>
          {showShareDropdown && (
            <div className="dropdown-menu share-menu">
              <button onClick={handleEmailPNG}>Email (PNG)</button>
              <button onClick={handleEmailPDF}>Email (PDF)</button>
              <button onClick={async () => {
                try { await shareBillAsImage(); } catch { showToast("error", "Share failed ✕"); } finally { dispatch(toggleShare(false)); }
              }}>📱 Mobile Share / WhatsApp</button>
              <button onClick={async () => {
                try { await downloadBillPDF(); } catch { showToast("error", "PDF failed ✕"); } finally { dispatch(toggleShare(false)); }
              }}>Download PDF</button>
            </div>
          )}
        </div>
      </div>

      <div className="bill-scroll-area">
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
                onChange={(e) => { setTypingDate(true); setDateValue(e.target.value.replace(/[^0-9-]/g, "")); }}
                onBlur={commitDate}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitDate(); } }}
                placeholder="DD-MM-YYYY"
              />
            </div>
          </div>

          <div className="bill-info-row to-section">
            <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
              <strong style={{ whiteSpace: "nowrap" }}>To :</strong>
              <input
                type="text"
                className="editable-span to-input"
                dir="ltr"
                value={toValue}
                onChange={(e) => {
                  const v = e.target.value; setToValue(v);
                  if (/^\d*$/.test(v.trim())) { setTypingId(true); dispatch(setCustomerId(v)); return; }
                  setTypingId(false); dispatch(setCustomerName(v));
                }}
                onBlur={commitToField}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitToField(); } }}
                placeholder="Customer Name / ID"
              />
              <span style={{ margin: 0, padding: 0, whiteSpace: "nowrap" }}>,</span>
              <input
                type="text"
                className="editable-span address-input"
                dir="ltr"
                value={customerAddress}
                onChange={(e) => dispatch(setCustomerAddress(e.target.value))}
                placeholder="Address"
              />
            </div>
          </div>

          <table className="bill-table">
            <colgroup>
              <col style={{ width: "6%" }} />  {/* S.No */}
              <col style={{ width: "32%" }} /> {/* Particulars */}
              <col style={{ width: "24%" }} /> {/* Kgs / Bunch */}
              <col style={{ width: "20%" }} /> {/* Rate */}
              <col style={{ width: "28%" }} /> {/* Amount */}
            </colgroup>
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
                          className="table-input"
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
                <strong>Note:</strong> We are Supplying Vegetables and Fruits only<br />
                GST NOT APPLICABLE<br />
              </div>
              Total in words: {numberToWords(total)}
            </div>
            <div className="total-amount">Total: ₹ {total.toFixed(2)}</div>
          </div>

          <p className="footer-sign">For VISHNU MARKETING CO.</p>
        </div>
      </div>

      {toast.show && (
        <div className="toast-notification" role="status" aria-live="polite">
          <div className="toast-content">
            <div className={`toast-icon ${toast.type}`}>
              {toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "i"}
            </div>
            <div className="toast-text">{toast.text}</div>
            <button onClick={() => setToast((t) => ({ ...t, show: false }))} className="toast-close">×</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bill;