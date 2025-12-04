import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/firebase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const collection = db.collection('sessions');

    // GET: Fetch one or all sessions
    if (req.method === "GET") {
      const { id } = req.query;

      if (id) {
        const doc = await collection.doc(String(id)).get();
        if (!doc.exists) return res.status(404).json({ error: "Not found" });
        return res.json({ id: doc.id, ...doc.data() });
      }

      // Fetch all, ordered by date
      const snapshot = await collection.orderBy('createdAt', 'desc').get();
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(sessions);
    }

    // POST: Create a new session
    if (req.method === "POST") {
      const data = req.body;
      const newSession = {
        ...data,
        createdAt: new Date().toISOString(),
        analysisStatus: 'processing' // Default status
      };
      
      const docRef = await collection.add(newSession);
      return res.json({ id: docRef.id, ...newSession });
    }

    // PATCH: Update a session
    if (req.method === "PATCH") {
      const { id, ...data } = req.body;
      if (!id) return res.status(400).json({ error: "Missing ID" });
      
      await collection.doc(id).update(data);
      return res.json({ id, ...data });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}