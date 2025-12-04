import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { db } from "@/lib/firebase";
import fs from "fs";
import path from "path";
import https from "https";
import os from "os";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY || "");

const downloadFile = (url: string, dest: string) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
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
    
    if (!session?.videoUrls || session.videoUrls.length === 0) {
      return res.status(400).json({ error: "No video found" });
    }

    const videoUrl = session.videoUrls[0];
    const tempFilePath = path.join(os.tmpdir(), `temp-${sessionId}.mp4`);

    // Download & Upload to Gemini
    await downloadFile(videoUrl, tempFilePath);
    const uploadResponse = await fileManager.uploadFile(tempFilePath, {
      mimeType: "video/mp4",
      displayName: `Session ${sessionId}`,
    });

    // Poll for readiness
    let file = await fileManager.getFile(uploadResponse.file.name);
    while (file.state === FileState.PROCESSING) {
      await new Promise((r) => setTimeout(r, 2000));
      file = await fileManager.getFile(uploadResponse.file.name);
    }

    if (file.state === FileState.FAILED) throw new Error("Video processing failed.");

    // --- THE UPGRADED PROMPT START ---
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const systemPrompt = `
    You are an elite-level surf coach with expertise in biomechanics and wave physics. 
    Your job is to analyze the attached surfing footage and provide ultra-specific, actionable feedback.
    
    SURFER PROFILE:
    - Stance: ${session?.stance} (Watch for this specifically)
    - Skill: ${session?.skillLevel}
    - Current Goals: ${session?.goals}

    ANALYSIS GUIDELINES:
    1. **Visual Proof Required:** Do not give generic advice. For every critique, you must reference specific visual evidence from the video (e.g., "At the bottom turn, your leading arm was trailing behind...").
    2. **Biomechanics Focus:** Focus on compression, rotation, eye gaze, rail engagement, and weight distribution.
    3. **No Fluff:** Avoid phrases like "Great job!" or "Keep surfing!". Go straight to the technical correction.
    4. **Sequential Breakdown:** Analyze the wave in phases: Setup -> Takeoff -> Bottom Turn -> Top Turn / Maneuver -> Exit.

    OUTPUT FORMAT (Strict JSON):
    {
      "summary_highlights": [
        "A short, high-impact bullet point about their best move.",
        "A short, high-impact bullet point about their biggest area for fix."
      ],
      "sections": {
        "takeoff": { 
          "tips": ["Specific observation + Correction"] 
        },
        "speed_generation": { 
          "tips": ["Specific observation + Correction"] 
        },
        "maneuvers": { 
          "tips": ["Specific observation + Correction"] 
        },
        "style_and_flow": { 
          "tips": ["Specific observation + Correction"] 
        }
      },
      "drills": { 
        "dry_land": ["Name of drill: Description of how to do it on land."], 
        "in_water": ["Name of drill: Description of focus while surfing."] 
      },
      "next_session_checklist": [
        "One technical cue to remember (e.g., 'Touch front knee on bottom turn')",
        "One equipment or positioning cue",
        "One mental cue"
      ]
    }
    `;
    // --- THE UPGRADED PROMPT END ---

    const result = await model.generateContent([
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
      { text: systemPrompt },
    ]);

    const responseText = result.response.text();
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) throw new Error("Invalid JSON from AI");
    
    const cleanJson = responseText.substring(startIndex, endIndex + 1);
    const feedback = JSON.parse(cleanJson);

    await docRef.update({ feedback, analysisStatus: "completed" });

    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    res.json({ ok: true, feedback });

  } catch (e: any) {
    console.error(e);
    try { await db.collection('sessions').doc(sessionId).update({ analysisStatus: "error" }); } catch (err) {}
    res.status(500).json({ error: e.message });
  }
}