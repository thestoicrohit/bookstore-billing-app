// ======= STATE =======
let books = []; // [{name, price, quantity, discount, final}]
let locked = false; // when final bill generated

// ======= UTIL =======
const $ = (id) => document.getElementById(id);

function toast(msg){
  const el = $("toast");
  el.textContent = msg;
  el.style.display = "block";
  el.style.opacity = "1";
  setTimeout(()=>{ el.style.opacity = "0"; el.style.display = "none"; }, 1800);
}

function generateInvoiceNumber(){
  // e.g. B-20251107-095423
  const d = new Date();
  const pad = (n) => String(n).padStart(2,"0");
  return `B-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function today(){
  const d = new Date();
  return d.toLocaleDateString();
}

// ======= STORAGE =======
function save(){
  const data = {
    books,
    customer: { name: $("customerName").value, phone: $("customerPhone").value },
    billNo: $("billNo").value,
    billDate: $("billDate").value,
    locked
  };
  localStorage.setItem("billing_app_state", JSON.stringify(data));
}

function load(){
  const raw = localStorage.getItem("billing_app_state");
  if(!raw){
    $("billNo").value = generateInvoiceNumber();
    $("billDate").value = today();
    return;
  }
  const data = JSON.parse(raw);
  books = data.books || [];
  $("customerName").value = data.customer?.name || "";
  $("customerPhone").value = data.customer?.phone || "";
  $("billNo").value = data.billNo || generateInvoiceNumber();
  $("billDate").value = data.billDate || today();
  locked = !!data.locked;
  updateTable();
  updateTotals();
}

// save customer fields on change
["customerName","customerPhone"].forEach(id=>{
  document.addEventListener("input", (e)=>{
    if(e.target.id === id){ save(); }
  });
});

// ======= CORE =======
function addBook(){
  if(locked){ toast("Bill is finalized. Clear to add more."); return; }

  const name = $("bookName").value.trim();
  const price = parseFloat($("price").value);
  const quantity = parseInt($("quantity").value);
  const discount = parseFloat($("discount").value || 0);

  if(!name || isNaN(price) || isNaN(quantity) || isNaN(discount)){
    toast("Please fill all fields correctly."); return;
  }
  if(discount < 0 || discount > 100){ toast("Discount must be 0–100%."); return; }
  if(price < 0 || quantity <= 0){ toast("Price/Qty must be positive."); return; }

  const total = price * quantity;
  const final = total - total * (discount/100);

  books.push({ name, price, quantity, discount, final: +final.toFixed(2) });

  $("bookName").value = "";
  $("price").value = "";
  $("quantity").value = "";
  $("discount").value = "";

  updateTable();
  updateTotals();
  save();
  toast("Book added.");
}

function deleteBook(idx){
  if(locked){ toast("Bill is finalized. Clear to edit."); return; }
  books.splice(idx,1);
  updateTable();
  updateTotals();
  save();
  toast("Removed.");
}

function updateTable(){
  const table = $("billTable");
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  books.forEach((b, i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${b.name}</td>
      <td>₹${b.price}</td>
      <td>${b.quantity}</td>
      <td>${b.discount}%</td>
      <td>₹${b.final.toFixed(2)}</td>
      <td class="no-print">
        <button class="btn btn-danger" onclick="deleteBook(${i})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  table.style.display = books.length ? "table" : "none";
}

function updateTotals(){
  const totalMRP = books.reduce((s,b)=> s + b.price*b.quantity, 0);
  const totalFinal = books.reduce((s,b)=> s + b.final, 0);
  const totalDiscount = totalMRP - totalFinal;

  $("totals").innerHTML = books.length
    ? `Total MRP: ₹${totalMRP.toFixed(2)} &nbsp;&nbsp; | &nbsp;&nbsp; ` +
      `Total Discount: ₹${totalDiscount.toFixed(2)} &nbsp;&nbsp; | &nbsp;&nbsp; ` +
      `Payable Amount: ₹${totalFinal.toFixed(2)}`
    : "";

  $("footerNote").textContent = books.length
    ? `Bill No: ${$("billNo").value} • Date: ${$("billDate").value} • Customer: ${$("customerName").value || "-"}`
    : "";
}

// Finalize
function generateBill(){
  if(!books.length){ toast("Add at least one item."); return; }
  locked = true;
  save();
  toast("Bill finalized. You can Print or Export PDF.");
}

// Print
function printBill(){
  if(!books.length){ toast("Nothing to print."); return; }
  window.print();
}

// Export PDF
async function exportPDF(){
  if(!books.length){ toast("Nothing to export."); return; }
  const bill = $("billArea");
  const canvas = await html2canvas(bill, {scale:2});
  const imgData = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // fit to width
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pageWidth - 20; // margin
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, "PNG", 10, 10, pdfWidth, Math.min(pdfHeight, pageHeight-20));
  pdf.save(`${$("billNo").value}.pdf`);
  toast("PDF saved.");
}

// Clear everything
function clearAll(){
  if(!confirm("Clear all items and reset bill?")) return;
  books = [];
  locked = false;
  $("customerName").value = "";
  $("customerPhone").value = "";
  $("billNo").value = generateInvoiceNumber();
  $("billDate").value = today();
  updateTable();
  updateTotals();
  save();
  toast("Cleared.");
}

// ======= INIT =======
window.addEventListener("DOMContentLoaded", load);
