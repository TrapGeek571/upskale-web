// api/stkPush.js
import { Buffer } from 'buffer';
import fetch from 'node-fetch';
export default async function handler(req, res) {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return res.status(500).json({ error: "Keys are missing in Vercel Settings" });
  }

  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Safaricom Auth Error:", data);
      return res.status(400).json({ error: "Safaricom rejected your keys", details: data });
    }

    const accessToken = data.access_token;
    // ... continue with the STK Push logic using the accessToken
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}