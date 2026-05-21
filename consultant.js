const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:";
const apiBase = isLocalhost ? "http://localhost:3001" : "";

const consultantMessage = document.getElementById("consultantMessage");
const bookingRows = document.getElementById("bookingRows");

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatLink(url) {
  if (!url) return "—";
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">Join</a>`;
}

function formatPhone(phone) {
  return phone || "—";
}

async function loadConsultantBookings() {
  const consultantId = getQueryParam("id");
  if (!consultantId) {
    consultantMessage.innerHTML =
      "No consultant ID provided. Add <code>?id=james</code> or another valid consultant id to the URL.";
    bookingRows.innerHTML = `<tr><td colspan="7">Consultant ID missing.</td></tr>`;
    return;
  }

  consultantMessage.innerHTML = `Showing bookings for <strong>${consultantId}</strong>. Refresh the page to update.`;

  try {
    const response = await fetch(
      `${apiBase}/api/consultant-bookings?consultantId=${encodeURIComponent(
        consultantId,
      )}`,
    );
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const bookings = await response.json();
    if (!Array.isArray(bookings) || bookings.length === 0) {
      bookingRows.innerHTML = `<tr><td colspan="7">No bookings found for this consultant.</td></tr>`;
      return;
    }

    bookingRows.innerHTML = bookings
      .map(
        (booking) => `<tr>
          <td>${booking.id}</td>
          <td>${formatPhone(booking.phone)}</td>
          <td>${booking.amount ? `KES ${booking.amount}` : "—"}</td>
          <td>${booking.status || "—"}</td>
          <td>${booking.receipt || "—"}</td>
          <td>${formatDate(booking.sessionStart)}</td>
          <td>${formatLink(booking.zoomLink)}</td>
        </tr>`,
      )
      .join("\n");
  } catch (error) {
    bookingRows.innerHTML = `<tr><td colspan="7">Unable to load bookings.</td></tr>`;
    consultantMessage.innerText = `Error loading bookings: ${error.message}`;
    console.error("Consultant dashboard error:", error);
  }
}

loadConsultantBookings();
