// api/stkPush.js
import { Buffer } from 'buffer';
import fetch from 'node-fetch';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { phone, amount } = req.body;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  try {
    // 1. Get Access Token
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const response = await fetch(url, 
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic $
    {auth}`
      }
    });
    const { access_token } = await tokenResponse.json();

    // 2. Generate Password & Timestamp
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

    // 3. Initiate STK Push
    const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // or CustomerBuyGoodsOnline
        Amount: amount,
        PartyA: phone, // Must be 254XXXXXXXXX
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: "https://upskale-web.vercel.app/api/callback", 
        AccountReference: "UpskaleSession",
        TransactionDesc: "Payment for Consultation"
      })
    });

    const data = await stkResponse.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}