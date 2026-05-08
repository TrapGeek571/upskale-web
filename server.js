require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const {
  MPESA_ENV = "sandbox",
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_CALLBACK_URL,
} = process.env;

const environment =
  MPESA_ENV.toLowerCase() === "production" ? "production" : "sandbox";
const baseUrl =
  environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

if (
  !MPESA_SHORTCODE ||
  !MPESA_PASSKEY ||
  !MPESA_CONSUMER_KEY ||
  !MPESA_CONSUMER_SECRET
) {
  console.error("Missing M-Pesa environment variables. Check your .env file.");
}

if (!MPESA_CALLBACK_URL) {
  console.error(
    "Missing MPESA_CALLBACK_URL. Set it in .env to a public HTTPS URL.",
  );
}

app.post("/api/stkPush", async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ error: "phone and amount are required" });
  }

  if (
    !MPESA_SHORTCODE ||
    !MPESA_PASSKEY ||
    !MPESA_CONSUMER_KEY ||
    !MPESA_CONSUMER_SECRET ||
    !MPESA_CALLBACK_URL
  ) {
    return res
      .status(500)
      .json({ error: "M-Pesa server configuration is incomplete" });
  }

  try {
    const auth = Buffer.from(
      `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`,
    ).toString("base64");
    const tokenResponse = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: { Authorization: `Basic ${auth}` },
      },
    );

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("Safaricom auth error:", tokenData);
      return res
        .status(tokenResponse.status)
        .json({ error: "Failed to get access token", details: tokenData });
    }

    const accessToken = tokenData.access_token;
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const password = Buffer.from(
      `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`,
    ).toString("base64");

    const stkPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: "UpskaleSession",
      TransactionDesc: "Payment for Consultation",
    };

    const stkResponse = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      },
    );

    const stkData = await stkResponse.json();
    if (!stkResponse.ok) {
      console.error("STK Push error:", stkData);
      return res
        .status(stkResponse.status)
        .json({ error: "STK Push failed", details: stkData });
    }

    return res.status(200).json(stkData);
  } catch (error) {
    console.error("STK Push exception:", error);
    return res.status(500).json({ error: error.message });
  }
});

let lastMpesaCallback = null;

app.post("/api/mpesa-callback", (req, res) => {
  lastMpesaCallback = {
    receivedAt: new Date().toISOString(),
    body: req.body,
  };

  console.log("M-Pesa callback received:", lastMpesaCallback);

  // Respond with 200 so Safaricom knows the callback was accepted.
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get("/api/mpesa-status", (req, res) => {
  if (!lastMpesaCallback) {
    return res.json({ status: "no callback received yet" });
  }

  return res.json(lastMpesaCallback);
});

const { paymentStatuses } = require("./shared/paymentStatuses");

app.get("/api/payment-status", (req, res) => {
  const { paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: "paymentId is required" });
  }

  const payment = paymentStatuses.get(paymentId);

  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }

  return res.status(200).json(payment);
});

app.listen(port, () => {
  console.log(
    `API server running at http://localhost:${port} (${environment})`,
  );
});
