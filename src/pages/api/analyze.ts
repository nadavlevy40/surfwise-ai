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
        const activeFrames = rawData.filter((d:any) => d.metrics?.compression < 160);
        const samples = activeFrames.length > 0 
          ? activeFrames.filter((_:any, i:number) => i % Math.ceil(activeFrames.length/20) === 0)
          : rawData.slice(0, 10);
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

    // --- NEW PROMPT FOR MANEUVER BREAKDOWN ---
    const systemPrompt = `
    You are an elite biomechanics surf coach.
    
    INPUTS:
    1. VIDEO: Watch for specific maneuvers (Takeoff, Bottom Turn, Top Turn, Cutback).
    2. TELEMETRY: { timestamp, left_knee_angle, right_knee_angle }.
       - Use these timestamps to pinpoint exactly when the maneuver happens.

    TASK:
    Identify 2-3 critical "Key Events" in the wave. For each event, provide the start/end time and specific feedback.

    SURFER GOALS: ${session?.goals || "General improvement"}

    OUTPUT FORMAT (Strict JSON):
    {
      "coach_summary": "One sentence summary of the whole ride.",
      "key_events": [
        {
          "title": "Name of Maneuver (e.g. Bottom Turn)",
          "start_time": number (seconds, e.g. 2.5),
          "end_time": number (seconds, e.g. 4.0),
          "score": number (1-10),
          "critique": "Specific technical feedback citing visual or telemetry evidence.",
          "correction": "One actionable drill or tip."
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