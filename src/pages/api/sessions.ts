import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/firebase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const collection = db.collection('sessions');

  try {
    // --- GET: Fetch Sessions (Filtered by User) ---
    if (req.method === "GET") {
      const { id, userId } = req.query;

      // 1. Fetch Single Session (e.g. for Results page)
      if (id) {
        const doc = await collection.doc(String(id)).get();
        if (!doc.exists) return res.status(404).json({ error: "Not found" });
        return res.json({ id: doc.id, ...doc.data() });
      }

      // 2. Fetch User's Library (CRITICAL FIX)
      if (userId) {
        const snapshot = await collection
          .where('userId', '==', userId) // <--- The Logic Fix
          .orderBy('createdAt', 'desc')
          .get();
          
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.json(sessions);
      }

      return res.status(400).json({ error: "Missing userId" });
    }

    // --- POST: Create Session ---
    if (req.method === "POST") {
      const data = req.body;
      const newSession = {
        ...data,
        createdAt: new Date().toISOString(),
        analysisStatus: 'processing'
      };
      
      const docRef = await collection.add(newSession);
      return res.json({ id: docRef.id, ...newSession });
    }

    // --- PATCH: Update Session ---
    if (req.method === "PATCH") {
      const { id, ...data } = req.body;
      if (!id) return res.status(400).json({ error: "Missing ID" });
      
      await collection.doc(id).update(data);
      return res.json({ id, ...data });
    }

    // --- DELETE: Remove Session (NEW FEATURE) ---
    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Missing ID" });

      await collection.doc(String(id)).delete();
      // Note: In a real prod app, you should also delete the video from Storage here.
      
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}