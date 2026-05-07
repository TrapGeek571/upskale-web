// api/callback.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const callbackData = req.body.Body.stkCallback;
  
  // Log the result so you can see it in your Vercel Logs
  console.log("M-Pesa Callback Received:", JSON.stringify(callbackData, null, 2));

  if (callbackData.ResultCode === 0) {
    // ResultCode 0 means SUCCESS
    const amount = callbackData.CallbackMetadata.Item.find(item => item.Name === 'Amount').Value;
    const receipt = callbackData.CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber').Value;
    const phone = callbackData.CallbackMetadata.Item.find(item => item.Name === 'PhoneNumber').Value;

    console.log(`Success! Receipt: ${receipt}, Amount: ${amount}, Phone: ${phone}`);
    
    // Here you would usually update your database to mark the session as "Paid"
  } else {
    // ResultCode non-zero means cancelled or failed
    console.log(`Payment failed: ${callbackData.ResultDesc}`);
  }

  // Safaricom expects a 200 OK response to stop retrying the callback
  res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
}