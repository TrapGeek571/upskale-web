// api/callback.js
const { paymentStatuses } = require('../shared/paymentStatuses');

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const callbackData = req.body.Body?.stkCallback || req.body;

  console.log(
    "M-Pesa Callback Received:",
    JSON.stringify(callbackData, null, 2),
  );

  if (callbackData?.ResultCode === 0) {
    const checkoutRequestId = callbackData.CheckoutRequestID;
    const amount = callbackData.CallbackMetadata?.Item?.find(
      (item) => item.Name === "Amount",
    )?.Value;
    const receipt = callbackData.CallbackMetadata?.Item?.find(
      (item) => item.Name === "MpesaReceiptNumber",
    )?.Value;
    const phone = callbackData.CallbackMetadata?.Item?.find(
      (item) => item.Name === "PhoneNumber",
    )?.Value;

    console.log(
      `Success! Receipt: ${receipt}, Amount: ${amount}, Phone: ${phone}`,
    );

    // Update payment status
    if (checkoutRequestId && paymentStatuses.has(checkoutRequestId)) {
      paymentStatuses.set(checkoutRequestId, {
        ...paymentStatuses.get(checkoutRequestId),
        status: "completed",
        receipt: receipt,
        completedAt: new Date().toISOString(),
        callbackData: callbackData,
      });
    }
  } else {
    console.log(`Payment failed: ${callbackData?.ResultDesc || "Unknown"}`);

    // Update payment status to failed
    const checkoutRequestId = callbackData?.CheckoutRequestID;
    if (checkoutRequestId && paymentStatuses.has(checkoutRequestId)) {
      paymentStatuses.set(checkoutRequestId, {
        ...paymentStatuses.get(checkoutRequestId),
        status: "failed",
        failedAt: new Date().toISOString(),
        error: callbackData?.ResultDesc,
        callbackData: callbackData,
      });
    }
  }

  return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
};
