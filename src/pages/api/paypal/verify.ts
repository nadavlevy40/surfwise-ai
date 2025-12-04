import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/firebase";

const getAccessToken = async () => {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { subscriptionID, userId } = req.body;

  try {
    const accessToken = await getAccessToken();

    // 1. Verify with PayPal
    const response = await fetch(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionID}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const subscription = await response.json();

    // 2. Check if active
    if (subscription.status === "ACTIVE") {
      console.log(`✅ User ${userId} upgraded to PRO via PayPal`);
      
      // 3. Update Firestore
      await db.collection("users").doc(userId).set({
        isPro: true,
        subscriptionId: subscriptionID,
        provider: "paypal",
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: "Subscription not active" });
    }

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}