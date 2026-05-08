const express = require("express");
const cors = require("cors");
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Mock STK Push endpoint
app.post("/api/stkPush", (req, res) => {
  const { phone, amount } = req.body;

  console.log("STK Push request:", { phone, amount });

  // Mock successful response
  res.json({
    ResponseCode: "0",
    ResponseDescription: "Success. Request accepted for processing",
    MerchantRequestID: "12345-67890-12345",
    CheckoutRequestID: "ws_CO_1234567890",
    CustomerMessage: "Success. Request accepted for processing",
  });
});

app.listen(port, () => {
  console.log(`Mock API server running at http://localhost:${port}`);
});
