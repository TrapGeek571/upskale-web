// Scroll reveal
const reveals = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add("visible"), i * 80);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 },
);
reveals.forEach((el) => observer.observe(el));

// Mobile menu
let menuOpen = false;
function toggleMenu(btn) {
  menuOpen = !menuOpen;
  const links = document.querySelector(".nav-links");
  if (menuOpen) {
    links.style.cssText = `
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 64px; left: 0; right: 0;
      background: rgba(11,61,46,0.98);
      padding: 2rem 5%;
      gap: 1.5rem;
      border-bottom: 1px solid rgba(201,168,76,0.15);
      backdrop-filter: blur(12px);
      z-index: 99;
    `;
    btn.children[0].style.transform = "rotate(45deg) translateY(7px)";
    btn.children[1].style.opacity = "0";
    btn.children[2].style.transform = "rotate(-45deg) translateY(-7px)";
  } else {
    links.style.display = "none";
    btn.children[0].style.transform = "";
    btn.children[1].style.opacity = "";
    btn.children[2].style.transform = "";
  }
}

// Close menu on nav link click
document.querySelectorAll(".nav-links a").forEach((a) => {
  a.addEventListener("click", () => {
    if (menuOpen) {
      const ham = document.querySelector(".hamburger");
      toggleMenu(ham);
    }
  });
});

async function payWithMpesa(phoneNumber, amount) {
  try {
    const response = await fetch("/api/stkPush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phoneNumber, // e.g., 254712345678
        amount: amount,
      }),
    });

    const result = await response.json();
    if (result.ResponseCode === "0") {
      alert("Please check your phone for the M-Pesa prompt.");
    } else {
      alert("Error initiating payment: " + result.CustomerMessage);
    }
  } catch (err) {
    console.error("Payment failed", err);
  }
}

let currentAmount = 3000;

// Wrap modal-related code in DOMContentLoaded to ensure elements exist
window.addEventListener("DOMContentLoaded", () => {
  function openPaymentModal(amount) {
    currentAmount = amount;
    document.getElementById("modalAmount").innerText =
      `KES ${amount.toLocaleString()}`;
    document.getElementById("paymentModal").style.display = "flex";
  }

  function closePaymentModal() {
    document.getElementById("paymentModal").style.display = "none";
  }

  // Close modal if user clicks outside of the content box
  window.onclick = function (event) {
    const modal = document.getElementById("paymentModal");
    if (event.target == modal) {
      closePaymentModal();
    }
  };

  // Function to check payment status
  async function checkPaymentStatus(paymentId) {
    const apiBase =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:3001"
        : "";

    try {
      const response = await fetch(
        `${apiBase}/api/payment-status?paymentId=${paymentId}`,
      );
      if (response.ok) {
        const status = await response.json();
        const statusDiv = document.getElementById("statusDiv");

        if (status.status === "completed") {
          statusDiv.innerText = `Payment successful! Receipt: ${status.receipt}`;
          statusDiv.style.color = "green";
          // Clear the stored payment ID
          localStorage.removeItem("currentPaymentId");
        } else if (status.status === "failed") {
          statusDiv.innerText = `Payment failed: ${status.error || "Unknown error"}`;
          statusDiv.style.color = "red";
          localStorage.removeItem("currentPaymentId");
        } else {
          // Still pending, check again in 5 seconds
          setTimeout(() => checkPaymentStatus(paymentId), 5000);
        }
      } else {
        console.error("Failed to check payment status");
        // Retry in 5 seconds
        setTimeout(() => checkPaymentStatus(paymentId), 5000);
      }
    } catch (err) {
      console.error("Error checking payment status:", err);
      // Retry in 5 seconds
      setTimeout(() => checkPaymentStatus(paymentId), 5000);
    }
  }

  // Handle Form Submission
  document
    .getElementById("paymentForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault(); // CRITICAL: Stops the 405 Method Not Allowed error

      const statusDiv = document.getElementById("paymentStatus");
      let phone = document.getElementById("mpesaPhone").value.trim();

      if (!phone) {
        statusDiv.innerText = "Please enter your M-Pesa phone number.";
        return;
      }

      phone = phone.replace(/\+/g, "");
      if (phone.startsWith("07")) {
        phone = "254" + phone.slice(1);
      }

      if (!/^254\d{9}$/.test(phone)) {
        statusDiv.innerText = "Enter a valid phone like 2547XXXXXXXX.";
        return;
      }

      statusDiv.innerText = "Sending prompt...";

      try {
        const apiBase =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
            ? "http://localhost:3001"
            : "";

        const response = await fetch(`${apiBase}/api/stkPush`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone, amount: currentAmount }),
        });

        if (response.ok) {
          const data = await response.json();
          statusDiv.innerText = "Check your phone for the M-Pesa PIN prompt!";
          console.log("Payment response:", data);

          // Store payment ID for status checking
          if (data.paymentId) {
            localStorage.setItem("currentPaymentId", data.paymentId);
            // Start checking payment status
            checkPaymentStatus(data.paymentId);
          }
        } else {
          const errorData = await response.json().catch(() => null);
          statusDiv.innerText =
            "Error: Payment failed to initialize" +
            (errorData?.error ? ` (${errorData.error})` : "");
          console.error("STK Push error response:", errorData);
        }
      } catch (err) {
        statusDiv.innerText =
          "Connection error. Make sure the backend server is running.";
        console.error("Payment error:", err);
      }
    });

  // Make functions globally accessible
  window.openPaymentModal = openPaymentModal;
  window.closePaymentModal = closePaymentModal;

  // Check for any pending payment on page load
  const pendingPaymentId = localStorage.getItem("currentPaymentId");
  if (pendingPaymentId) {
    checkPaymentStatus(pendingPaymentId);
  }
});
