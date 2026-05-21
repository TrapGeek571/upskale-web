require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { run, get, all } = require("./shared/database");
const { createZoomMeeting } = require("./shared/zoom");
const {
  sendEmailNotification,
  sendWhatsAppNotification,
} = require("./shared/notifications");
const app = express();
const port = process.env.PORT || 3001;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "upskale123";

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Upskale Admin"');
    return res.status(401).send("Authentication required");
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
  const [username, password] = credentials.split(":");

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Upskale Admin"');
  return res.status(401).send("Invalid credentials");
}

app.use(cors());
app.use(express.json());

app.get("/admin", adminAuth, (req, res) => {
  res.redirect("/admin.html");
});

app.get("/admin.html", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin.js", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.js"));
});

app.use("/admin", adminAuth);
app.use(express.static(path.join(__dirname, ".")));

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

async function savePayment({
  paymentId,
  phone,
  amount,
  stkResponse,
  consultantId,
  consultantName,
}) {
  await run(
    `INSERT OR REPLACE INTO payments (
      id,
      phone,
      amount,
      status,
      createdAt,
      callbackData,
      consultantId,
      consultantName
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paymentId,
      phone,
      amount,
      "pending",
      new Date().toISOString(),
      JSON.stringify(stkResponse),
      consultantId || null,
      consultantName || null,
    ],
  );
}

async function updatePayment(paymentId, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;

  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const params = keys.map((key) => fields[key]);
  params.push(paymentId);

  await run(`UPDATE payments SET ${setClause} WHERE id = ?`, params);
}

async function getPayment(paymentId) {
  const payment = await get("SELECT * FROM payments WHERE id = ? LIMIT 1", [
    paymentId,
  ]);

  if (!payment) return null;

  return {
    ...payment,
    callbackData: payment.callbackData
      ? JSON.parse(payment.callbackData)
      : null,
  };
}

async function getPayments() {
  const rows = await all("SELECT * FROM payments ORDER BY createdAt DESC");
  return rows.map((payment) => ({
    ...payment,
    callbackData: payment.callbackData
      ? JSON.parse(payment.callbackData)
      : null,
  }));
}

app.get("/api/payments", adminAuth, async (req, res) => {
  try {
    const payments = await getPayments();
    return res.status(200).json(payments);
  } catch (error) {
    console.error("Failed to fetch payments:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/consultant-bookings", async (req, res) => {
  const { consultantId } = req.query;
  if (!consultantId) {
    return res.status(400).json({ error: "consultantId is required" });
  }

  try {
    const rows = await all(
      "SELECT * FROM payments WHERE consultantId = ? ORDER BY createdAt DESC",
      [consultantId],
    );

    return res.status(200).json(
      rows.map((payment) => ({
        ...payment,
        callbackData: payment.callbackData
          ? JSON.parse(payment.callbackData)
          : null,
      })),
    );
  } catch (error) {
    console.error("Failed to fetch consultant bookings:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/stkPush", async (req, res) => {
  const { phone, amount, consultantId, consultantName } = req.body;

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

    const paymentId = stkData.CheckoutRequestID || `payment_${Date.now()}`;
    await savePayment({
      paymentId,
      phone,
      amount,
      stkResponse: stkData,
      consultantId,
      consultantName,
    });

    return res.status(200).json({ ...stkData, paymentId });
  } catch (error) {
    console.error("STK Push exception:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/mpesa-callback", async (req, res) => {
  const callbackData = req.body.Body?.stkCallback || req.body;
  console.log(
    "M-Pesa callback received:",
    JSON.stringify(callbackData, null, 2),
  );

  const checkoutRequestId = callbackData?.CheckoutRequestID;
  if (!checkoutRequestId) {
    return res.status(400).json({ error: "Missing CheckoutRequestID" });
  }

  const payment = await getPayment(checkoutRequestId);
  if (!payment) {
    console.warn(`Payment record not found for ${checkoutRequestId}`);
    return res.status(404).json({ error: "Payment record not found" });
  }

  if (callbackData?.ResultCode === 0) {
    const amount = callbackData.CallbackMetadata?.Item?.find(
      (item) => item.Name === "Amount",
    )?.Value;
    const receipt = callbackData.CallbackMetadata?.Item?.find(
      (item) => item.Name === "MpesaReceiptNumber",
    )?.Value;
    const phone = callbackData.CallbackMetadata?.Item?.find(
      (item) => item.Name === "PhoneNumber",
    )?.Value;

    let zoomMeeting = {
      join_url: null,
      meetingId: null,
      start_time: null,
      topic: "Upskale Session",
    };

    try {
      zoomMeeting = await createZoomMeeting({
        topic: `Upskale Session for ${phone || checkoutRequestId}`,
      });
    } catch (zoomError) {
      console.warn("Zoom meeting creation error:", zoomError.message);
    }

    await updatePayment(checkoutRequestId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      receipt,
      callbackData: JSON.stringify(callbackData),
      zoomLink: zoomMeeting.join_url,
      zoomMeetingId: zoomMeeting.meetingId,
      zoomTopic: zoomMeeting.topic,
      sessionStart: zoomMeeting.start_time,
      sessionEnd: zoomMeeting.start_time
        ? new Date(
            new Date(zoomMeeting.start_time).getTime() + 60 * 60000,
          ).toISOString()
        : null,
    });

    // Notify consultant (or fallback admin) via email and WhatsApp if configured
    try {
      function getConsultantContact(id) {
        const key = id ? String(id).toUpperCase() : "";
        const email =
          process.env[`CONSULTANT_${key}_EMAIL`] || process.env.ADMIN_EMAIL;
        const phone =
          process.env[`CONSULTANT_${key}_PHONE`] ||
          process.env.ADMIN_WHATSAPP_PHONE;
        return { email, phone };
      }

      const contact = getConsultantContact(
        payment.consultantId || payment.consultant || null,
      );
      const notifications = [];

      if (contact.email) {
        const emailRes = await sendEmailNotification({
          to: contact.email,
          subject: `New Upskale booking: ${checkoutRequestId}`,
          text: `A customer (${phone}) has paid KES ${amount || payment.amount || ""} for a session.\nZoom link: ${zoomMeeting.join_url || "(pending)"}`,
          html: `<p>A customer (${phone}) has paid KES ${amount || payment.amount || ""} for a session.</p><p>Zoom link: <a href="${zoomMeeting.join_url}">${zoomMeeting.join_url}</a></p>`,
        });
        notifications.push({
          channel: "email",
          to: contact.email,
          result: emailRes,
        });
      }

      if (contact.phone) {
        const waRes = await sendWhatsAppNotification({
          toPhone: contact.phone,
          message: `New Upskale booking for ${payment.consultantName || checkoutRequestId}. Customer: ${phone}. Zoom: ${zoomMeeting.join_url || "pending"}`,
        });
        notifications.push({
          channel: "whatsapp",
          to: contact.phone,
          result: waRes,
        });
      }

      if (notifications.length > 0) {
        await updatePayment(checkoutRequestId, {
          notificationLog: JSON.stringify(notifications),
          notificationEmailSent: notifications.some(
            (n) => n.channel === "email" && n.result && n.result.ok,
          )
            ? 1
            : 0,
          notificationWhatsAppSent: notifications.some(
            (n) => n.channel === "whatsapp" && n.result && n.result.ok,
          )
            ? 1
            : 0,
        });
      }
    } catch (notifyErr) {
      console.error("Notification send failed:", notifyErr);
    }
  } else {
    const errorDesc = callbackData?.ResultDesc || "Unknown";
    await updatePayment(checkoutRequestId, {
      status: "failed",
      callbackData: JSON.stringify(callbackData),
      receipt: null,
      completedAt: new Date().toISOString(),
    });
    console.log(`Payment failed: ${errorDesc}`);
  }

  return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get("/api/payment-status", async (req, res) => {
  const { paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: "paymentId is required" });
  }

  const payment = await getPayment(paymentId);
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
