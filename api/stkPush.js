// api/stkPush.js
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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
    !MPESA_CONSUMER_SECRET ||
    !MPESA_CALLBACK_URL
  ) {
    return res
      .status(500)
      .json({ error: "M-Pesa configuration is incomplete" });
  }

  const { phone, amount } = req.body;
  if (!phone || !amount) {
    return res.status(400).json({ error: "phone and amount are required" });
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

// api/stkPush.js
const { paymentStatuses } = require('../shared/paymentStatuses');

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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
    !MPESA_CONSUMER_SECRET ||
    !MPESA_CALLBACK_URL
  ) {
    return res
      .status(500)
      .json({ error: "M-Pesa configuration is incomplete" });
  }

  const { phone, amount } = req.body;
  if (!phone || !amount) {
    return res.status(400).json({ error: "phone and amount are required" });
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

    // Store payment status for tracking
    const paymentId = stkData.CheckoutRequestID || `payment_${Date.now()}`;
    paymentStatuses.set(paymentId, {
      id: paymentId,
      phone: phone,
      amount: amount,
      status: "pending",
      createdAt: new Date().toISOString(),
      stkResponse: stkData,
    });

    return res.status(200).json({
      ...stkData,
      paymentId: paymentId,
    });
  } catch (error) {
    console.error("STK Push exception:", error);
    return res.status(500).json({ error: error.message });
  }
};
