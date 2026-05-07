// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
reveals.forEach(el => observer.observe(el));

// Mobile menu
let menuOpen = false;
function toggleMenu(btn) {
  menuOpen = !menuOpen;
  const links = document.querySelector('.nav-links');
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
    btn.children[0].style.transform = 'rotate(45deg) translateY(7px)';
    btn.children[1].style.opacity = '0';
    btn.children[2].style.transform = 'rotate(-45deg) translateY(-7px)';
  } else {
    links.style.display = 'none';
    btn.children[0].style.transform = '';
    btn.children[1].style.opacity = '';
    btn.children[2].style.transform = '';
  }
}

// Close menu on nav link click
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    if (menuOpen) {
      const ham = document.querySelector('.hamburger');
      toggleMenu(ham);
    }
  });
});

async function payWithMpesa(phoneNumber, amount) {
  try {
    const response = await fetch('/api/stkPush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phoneNumber, // e.g., 254712345678
        amount: amount
      })
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

function openPaymentModal(amount) {
  currentAmount = amount;
  document.getElementById('modalAmount').innerText = `KES ${amount.toLocaleString()}`;
  document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
}

// Close modal if user clicks outside of the content box
window.onclick = function(event) {
  const modal = document.getElementById('paymentModal');
  if (event.target == modal) {
    closePaymentModal();
  }
}

// Handle Form Submission
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('mpesaPhone').value;
  const statusDiv = document.getElementById('paymentStatus');
  const submitBtn = e.target.querySelector('button');

  statusDiv.innerText = "Initiating payment...";
  statusDiv.style.color = "var(--text-mid)";
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/stkPush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, amount: currentAmount })
    });

    const result = await response.json();

    if (result.ResponseCode === "0") {
      statusDiv.innerText = "Prompt sent! Check your phone to complete payment.";
      statusDiv.style.color = "var(--green-light)";
    } else {
      statusDiv.innerText = "Error: " + (result.CustomerMessage || "Please try again.");
      statusDiv.style.color = "red";
      submitBtn.disabled = false;
    }
  } catch (err) {
    statusDiv.innerText = "Connection error. Please try again later.";
    statusDiv.style.color = "red";
    submitBtn.disabled = false;
  }
});