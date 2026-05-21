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
        consultantId: selectedConsultant?.id,
        consultantName: selectedConsultant?.name,
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
let selectedConsultant = null;
let selectedPlan = null;

const plans = [
  {
    price: 3000,
    name: "Starter Session",
    summary: "60-minute Zoom session",
    features: [
      "1-on-1 with a vetted consultant",
      "You set the agenda",
      "WhatsApp action summary after",
      "Pay via M-Pesa instantly",
    ],
  },
  {
    price: 5000,
    name: "Deep Dive",
    summary: "90-minute working session",
    features: [
      "Extended focus time",
      "Pre-session brief review",
      "Detailed written action plan",
      "Follow-up WhatsApp Q&A",
    ],
  },
  {
    price: 12000,
    name: "Monthly Retainer",
    summary: "4 sessions per month",
    features: [
      "Same consultant every session",
      "Priority booking slots",
      "Ongoing WhatsApp support",
      "Monthly progress review",
    ],
  },
];

const consultants = [
  {
    id: "james",
    name: "James Mwangi",
    role: "Business Strategy",
    exp: "9 years experience · Nairobi",
    bio: "Former corporate strategist turned SME advisor. Has guided 50+ Kenyan businesses through growth planning, market entry, and investor-ready positioning.",
    tags: ["Growth Planning", "Market Entry", "Investor Pitch"],
  },
  {
    id: "caroline",
    name: "Caroline Otieno",
    role: "Financial Advisory",
    exp: "12 years experience · Nairobi",
    bio: "Certified Public Accountant with a background in banking and SME lending. Specialises in cash flow management, KRA compliance, and structuring businesses for growth capital.",
    tags: ["Cash Flow", "Tax & KRA", "Fundraising"],
  },
  {
    id: "michael",
    name: "Michael Kipchoge",
    role: "Marketing & Digital Growth",
    exp: "7 years experience · Nairobi",
    bio: "Digital growth strategist with a track record across FMCG, retail, and fintech. Helps SMEs build brand visibility and customer acquisition systems on lean budgets.",
    tags: ["Social Media", "Paid Ads", "Brand Identity"],
  },
  {
    id: "lilian",
    name: "Lilian Njoroge",
    role: "Operations & Process",
    exp: "8 years experience · Mombasa",
    bio: "Operations specialist and certified Lean practitioner. Has helped logistics, retail, and manufacturing SMEs cut costs, streamline processes, and build teams that scale.",
    tags: ["Lean Ops", "Team Scaling", "Process Design"],
  },
  {
    id: "samuel",
    name: "Samuel Barasa",
    role: "Legal & Compliance",
    exp: "10 years experience · Nairobi",
    bio: "Commercial lawyer with deep expertise in Kenyan company law, contract drafting, and regulatory compliance. Trusted by early-stage and scaling SMEs across multiple sectors.",
    tags: ["Contracts", "Company Law", "Compliance"],
  },
];

function getConsultantById(id) {
  return consultants.find((consultant) => consultant.id === id) || null;
}

function selectConsultant(id, name) {
  selectedConsultant = { id, name };
  window.openPlanModal?.();
}

function openPricingPlan(amount) {
  selectedPlan = amount;
  currentAmount = amount;
  renderConsultantChoices();
  const modal = document.getElementById("consultantModal");
  const planText = document.getElementById("consultantModalPlanText");
  if (planText) {
    planText.innerHTML = `Plan: <strong>KES ${amount.toLocaleString()}</strong>`;
  }
  if (modal) {
    modal.style.display = "flex";
  }
}

function choosePlan(amount) {
  selectedPlan = amount;
  currentAmount = amount;
  closePlanModal();
  openPaymentModal(amount);
}

function renderPlanChoices() {
  const container = document.getElementById("planOptions");
  if (!container) return;
  container.innerHTML = plans
    .map(
      (plan) => `
        <div style="border: 1px solid rgba(11, 61, 46, 0.12); padding: 1rem; border-radius: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.85rem;">
            <div>
              <strong style="font-size: 1rem; display: block; margin-bottom: 0.35rem;">${plan.name}</strong>
              <div style="font-size: 0.95rem; color: #555;">${plan.summary}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1rem; font-weight: 700;">KES ${plan.price.toLocaleString()}</div>
              <button onclick="choosePlan(${plan.price})" class="price-btn" style="margin-top: 0.5rem; padding: 0.55rem 0.9rem; font-size: 0.9rem;">
                Choose
              </button>
            </div>
          </div>
          <ul style="margin: 0; padding-left: 1.15rem; color: #555; font-size: 0.9rem;">
            ${plan.features
              .map(
                (feature) =>
                  `<li style="margin-bottom: 0.4rem; line-height: 1.4;">${feature}</li>`,
              )
              .join("")}
          </ul>
        </div>
      `,
    )
    .join("");
}

function renderConsultantChoices() {
  const list = document.getElementById("consultantList");
  if (!list) return;
  list.innerHTML = consultants
    .map(
      (consultant) => `
        <div style="border: 1px solid rgba(11, 61, 46, 0.1); padding: 1rem; border-radius: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.5rem;">
            <div>
              <strong style="font-size: 1rem;">${consultant.name}</strong>
              <p style="margin: 0.25rem 0 0; font-size: 0.85rem; color: #555;">${consultant.role}</p>
            </div>
            <button onclick="selectConsultantForPlan('${consultant.id}', '${consultant.name.replace("'", "\'")}')" class="price-btn" style="padding: 0.5rem 0.85rem; font-size: 0.9rem;">
              Choose
            </button>
          </div>
          <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">${consultant.bio}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
            ${consultant.tags.map((tag) => `<span style="background: rgba(201,168,76,0.12); color:#0b3d2e; padding: 0.25rem 0.5rem; border-radius:4px; font-size:0.8rem;">${tag}</span>`).join("")}
          </div>
        </div>
      
    `,
    )
    .join("");
}

function selectConsultantForPlan(id, name) {
  selectedConsultant = { id, name };
  window.closeConsultantModal?.();
  window.openPaymentModal?.(currentAmount);
}

// Wrap modal-related code in DOMContentLoaded to ensure elements exist
window.addEventListener("DOMContentLoaded", () => {
  function openPlanModal() {
    const modal = document.getElementById("planModal");
    const consultantText = document.getElementById("planModalConsultantText");
    if (consultantText && selectedConsultant) {
      consultantText.innerHTML = `Consultant: <strong>${selectedConsultant.name}</strong>`;
    }
    renderPlanChoices();
    if (modal) {
      modal.style.display = "flex";
    }
  }

  function closePlanModal() {
    const modal = document.getElementById("planModal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  function openConsultantModal() {
    const modal = document.getElementById("consultantModal");
    if (modal) {
      modal.style.display = "flex";
    }
  }

  function closeConsultantModal() {
    const modal = document.getElementById("consultantModal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  function openPaymentModal(amount) {
    currentAmount = amount;
    const amountText = `KES ${amount.toLocaleString()}`;
    const modalAmount = document.getElementById("modalAmount");
    const buttonAmount = document.getElementById("buttonAmount");
    const consultantName = document.getElementById("confirmConsultantName");
    const statusDiv = document.getElementById("paymentStatus");

    if (modalAmount) {
      modalAmount.innerText = amountText;
    }
    if (buttonAmount) {
      buttonAmount.innerText = amountText;
    }
    if (consultantName && selectedConsultant) {
      consultantName.innerText = selectedConsultant.name;
    }
    if (statusDiv) {
      statusDiv.innerText = "";
      statusDiv.style.color = "";
    }

    const modal = document.getElementById("paymentModal");
    if (modal) {
      modal.style.display = "flex";
    }
  }

  function closePaymentModal() {
    const modal = document.getElementById("paymentModal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  function animateStatusCard(element) {
    if (!element) return;
    element.classList.remove("status-appear");
    void element.offsetWidth;
    element.classList.add("status-appear");
  }

  // Close modal if user clicks outside of the content box
  window.onclick = function (event) {
    const modalIds = ["paymentModal", "planModal", "consultantModal"];
    modalIds.forEach((modalId) => {
      const modal = document.getElementById(modalId);
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
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
        const statusDiv = document.getElementById("paymentStatus");

        if (status.status === "completed") {
          if (status.zoomLink) {
            const sessionTime = status.sessionStart
              ? `Session starts: ${new Date(status.sessionStart).toLocaleString()}`
              : "";
            statusDiv.innerHTML = `
              <div>
                <p><strong>Payment successful!</strong></p>
                <p>Receipt: ${status.receipt}</p>
                ${sessionTime ? `<p>${sessionTime}</p>` : ""}
                <p><a class="btn-primary" href="${status.zoomLink}" target="_blank" rel="noopener noreferrer">Join your Zoom session</a></p>
              </div>
            `;
          } else {
            statusDiv.innerText =
              "Payment successful! Your Zoom link will be sent shortly once the session is ready.";
          }
          statusDiv.style.color = "green";
          animateStatusCard(statusDiv);
          localStorage.removeItem("currentPaymentId");
        } else if (status.status === "failed") {
          statusDiv.innerText = `Payment failed: ${status.error || "Unknown error"}`;
          statusDiv.style.color = "red";
          animateStatusCard(statusDiv);
          localStorage.removeItem("currentPaymentId");
        } else {
          setTimeout(() => checkPaymentStatus(paymentId), 5000);
        }
      } else {
        console.error("Failed to check payment status");
        setTimeout(() => checkPaymentStatus(paymentId), 5000);
      }
    } catch (err) {
      console.error("Error checking payment status:", err);
      setTimeout(() => checkPaymentStatus(paymentId), 5000);
    }
  }

  // Function to scroll to pricing section
  function scrollToPricing() {
    const pricingSection = document.getElementById("pricing");
    pricingSection.scrollIntoView({ behavior: "smooth" });
  }

  // Handle Form Submission
  document
    .getElementById("paymentForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

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

      if (!selectedConsultant) {
        statusDiv.innerText = "Please choose a consultant before paying.";
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
          body: JSON.stringify({
            phone,
            amount: currentAmount,
            consultantId: selectedConsultant.id,
            consultantName: selectedConsultant.name,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          statusDiv.innerText = "Check your phone for the M-Pesa PIN prompt!";
          console.log("Payment response:", data);

          if (data.paymentId) {
            localStorage.setItem("currentPaymentId", data.paymentId);
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

  // Expose methods globally for button event handlers
  window.openPaymentModal = openPaymentModal;
  window.openPlanModal = openPlanModal;
  window.closePaymentModal = closePaymentModal;
  window.openPricingPlan = openPricingPlan;
  window.selectConsultant = selectConsultant;
  window.choosePlan = choosePlan;
  window.closePlanModal = closePlanModal;
  window.closeConsultantModal = closeConsultantModal;
  window.scrollToPricing = scrollToPricing;

  const pendingPaymentId = localStorage.getItem("currentPaymentId");
  if (pendingPaymentId) {
    checkPaymentStatus(pendingPaymentId);
  }
});
