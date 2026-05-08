// api/payment-status.js
const { paymentStatuses } = require("../shared/paymentStatuses");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: "paymentId is required" });
  }

  const payment = paymentStatuses.get(paymentId);

  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }

  return res.status(200).json(payment);
};
