const isLocalHost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:";
const apiBase = isLocalHost ? "http://localhost:3001" : "";

const paymentRows = document.getElementById("paymentRows");
const adminStatus = document.getElementById("adminStatus");
const refreshButton = document.getElementById("refreshPayments");

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString();
}

function formatLink(url) {
  if (!url) return "—";
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">Open Zoom</a>`;
}

function formatPhone(phone) {
  return phone || "—";
}

async function loadPayments() {
  adminStatus.textContent = "Loading latest bookings...";
  paymentRows.innerHTML = `<tr><td colspan="9">Loading payments...</td></tr>`;

  try {
    const response = await fetch(`${apiBase}/api/payments`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const payments = await response.json();
    if (!Array.isArray(payments) || payments.length === 0) {
      paymentRows.innerHTML = `<tr><td colspan="9">No sessions found yet.</td></tr>`;
      adminStatus.textContent = "No session bookings available.";
      return;
    }

    paymentRows.innerHTML = payments
      .map((payment) => {
        return `<tr>
          <td>${payment.id}</td>
          <td>${formatPhone(payment.phone)}</td>
          <td>${payment.amount ? `KES ${payment.amount}` : "—"}</td>
          <td>${payment.consultantName || "—"}</td>
          <td>${payment.status || "unknown"}</td>
          <td>${payment.receipt || "—"}</td>
          <td>${formatLink(payment.zoomLink)}</td>
          <td>${formatDate(payment.createdAt)}</td>
          <td>${formatDate(payment.completedAt)}</td>
        </tr>`;
      })
      .join("\n");

    adminStatus.textContent = `Loaded ${payments.length} booking(s).`;
  } catch (error) {
    paymentRows.innerHTML = `<tr><td colspan="9">Unable to load payments.</td></tr>`;
    adminStatus.textContent = `Error loading bookings: ${error.message}`;
    console.error("Admin dashboard error:", error);
  }
}

refreshButton.addEventListener("click", () => {
  loadPayments();
});

loadPayments();
