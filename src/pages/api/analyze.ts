import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { db } from "@/lib/firebase";
import fs from "fs";
import path from "path";
import https from "https";
import os from "os";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY || "");

const downloadFile = (url: string, dest: string) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
};

const fetchJson = (url: string) => {
  return new Promise<any>((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', reject);
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId } = req.body;

  try {
    const docRef = db.collection('sessions').doc(sessionId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Session not found" });
    const session = doc.data();

    if (!session?.videoUrls?.[0]) return res.status(400).json({ error: "No video" });
    const videoUrl = session.videoUrls[0];
    const tempFilePath = path.join(os.tmpdir(), `temp-${sessionId}.mp4`);
    
    await downloadFile(videoUrl, tempFilePath);
    const uploadResponse = await fileManager.uploadFile(tempFilePath, {
      mimeType: "video/mp4",
      displayName: `Session ${sessionId}`,
    });

    // Prepare Telemetry
    let telemetrySummary = "No telemetry data available.";
    if (session?.skeletonUrl) {
      const rawData = await fetchJson(session.skeletonUrl);
      if (rawData && rawData.length > 0) {
        const activeFrames = rawData.filter((d:any) => d.metrics?.compression < 165);
        const samples = activeFrames.length > 0 
          ? activeFrames.filter((_:any, i:number) => i % Math.ceil(activeFrames.length/15) === 0)
          : rawData.slice(0, 15);
        telemetrySummary = JSON.stringify(samples);
      }
    }

    let file = await fileManager.getFile(uploadResponse.file.name);
    while (file.state === FileState.PROCESSING) {
      await new Promise(r => setTimeout(r, 2000));
      file = await fileManager.getFile(uploadResponse.file.name);
    }
    if (file.state === FileState.FAILED) throw new Error("Video processing failed.");

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash", 
      generationConfig: { responseMimeType: "application/json" }
    });

    // --- ENHANCED PROMPT FOR PERSONALIZATION ---
    const systemPrompt = `
    You are an elite, personal surf coach. Your goal is to make the user surf better today.
    
    USER CONTEXT:
    - Skill: ${session?.skillLevel} (Adjust language complexity accordingly)
    - Stance: ${session?.stance}
    - Board: ${session?.boardType || "Not specified"} (CRITICAL: Adjust advice. Longboards need trim; shortboards need pumping)
    - Conditions: ${session?.conditions || "Not specified"} (CRITICAL: If small waves, focus on speed generation. If big, focus on control)
    - Goal: ${session?.goals}

    DATA INPUTS:
    1. VIDEO: Identify the maneuvers.
    2. TELEMETRY: Use knee angles to prove your critique.

    OUTPUT GUIDELINES:
    - **Easy to Understand:** Use analogies (e.g., "compress like a spring", "look where you want to go like driving a car").
    - **Personalized:** Reference their specific board and conditions in the text.
    - **Maneuver Isolation:** Find distinct maneuvers. If the wave is one long ride, break it into "Takeoff", "Down the Line", "End Section".

    OUTPUT FORMAT (Strict JSON):
    {
      "coach_summary": "A warm, 2-sentence summary referencing their board and conditions.",
      "key_events": [
        {
          "title": "Name of Maneuver",
          "start_time": number (seconds),
          "end_time": number (seconds),
          "score": number (1-10),
          "critique": "Detailed technical analysis.",
          "correction": "A simple, memorable instruction.",
          "analogy": "A visual metaphor to help them remember the fix (e.g. 'Hold a tray of drinks')."
        }
      ],
      "next_session_focus": ["string", "string"]
    }
    `;

    const result = await model.generateContent([
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
      { text: systemPrompt },
    ]);

    const responseText = result.response.text();
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("Invalid JSON");
    
    const feedback = JSON.parse(responseText.substring(startIndex, endIndex + 1));
    await docRef.update({ feedback, analysisStatus: "completed" });

    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    res.json({ ok: true, feedback });

  } catch (e: any) {
    console.error(e);
    try { await db.collection('sessions').doc(sessionId).update({ analysisStatus: "error" }); } catch {}
    res.status(500).json({ error: e.message });
  }
}