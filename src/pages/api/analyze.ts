import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/firebase";
import fs from "fs";
import path from "path";
import https from "https";
import os from "os";
import ffmpeg from "fluent-ffmpeg";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

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

// Extract Frames (We still need frames so the AI can "see" the motion)
const extractFrames = (videoPath: string, outputDir: string) => {
  return new Promise<string[]>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions("-vf", "fps=5,scale=480:-1") 
      .output(`${outputDir}/frame-%03d.jpg`)
      .on("end", () => {
        const files = fs.readdirSync(outputDir)
          .filter(f => f.endsWith('.jpg'))
          .sort()
          .map(f => path.join(outputDir, f));
        resolve(files);
      })
      .on("error", (err) => reject(err))
      .run();
  });
};

const fileToGenerativePart = (path: string, mimeType: string) => {
  return {
    inlineData: {
      data: fs.readFileSync(path).toString("base64"),
      mimeType
    },
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId } = req.body;
  const tempDir = path.join(os.tmpdir(), `session-${sessionId}`);
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  
  const videoPath = path.join(tempDir, "input.mp4");

  try {
    const docRef = db.collection('sessions').doc(sessionId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Session not found" });
    const session = doc.data();

    await downloadFile(session?.videoUrls?.[0], videoPath);

    const allFramePaths = await extractFrames(videoPath, tempDir);
    
    // Smart Downsampling: Ensure we see the WHOLE video by taking 300 even samples
    const TARGET_FRAME_COUNT = 300;
    let selectedFrames = [];
    
    if (allFramePaths.length <= TARGET_FRAME_COUNT) {
      selectedFrames = allFramePaths;
    } else {
      const step = allFramePaths.length / TARGET_FRAME_COUNT;
      for (let i = 0; i < TARGET_FRAME_COUNT; i++) {
        const index = Math.floor(i * step);
        if (allFramePaths[index]) selectedFrames.push(allFramePaths[index]);
      }
    }

    const imageParts = selectedFrames.map(p => fileToGenerativePart(p, "image/jpeg"));

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash", 
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
    You are an Elite Surf Coach analyzing a full training session.
    
    YOUR MISSION:
    Identify and list every distinct Drill or Maneuver attempt in the session.
    
    CONTEXT:
    - The user wants a LIST of what they did.
    - They do NOT need timestamps.
    - They DO need you to separate different events (e.g. "First Wave", "Second Wave").

    ANALYSIS RULES:
    1. **Separate by Attempt:** If the surfer rides a wave, falls, paddles back, and rides again... that is TWO items in the list.
    2. **Look for 360s:** Check for rotation. If they spin, call it an "Air Reverse" or "360".
    3. **Ignore "Nothing" Time:** Do not create list items for paddling or sitting. Only list the Action.

    OUTPUT FORMAT (Strict JSON):
    {
      "coach_summary": "Overall feedback on the session intensity and performance.",
      "key_events": [
        {
          "title": "Drill Name (e.g. 'Opening Bottom Turn', '360 Air Attempt')",
          "score": 0,
          "critique": "Technical analysis of this specific move.",
          "correction": "One specific fix.",
          "analogy": "Visual metaphor."
        }
      ],
      "next_session_focus": ["Focus 1", "Focus 2"]
    }
    `;

    const result = await model.generateContent([
      systemPrompt, 
      ...imageParts
    ]);

    const responseText = result.response.text();
    const cleanJson = responseText.substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1);
    const feedback = JSON.parse(cleanJson);

    await docRef.update({ feedback, analysisStatus: "completed" });
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    res.json({ ok: true, feedback });

  } catch (e: any) {
    console.error("Analysis Error:", e);
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    res.status(500).json({ error: e.message });
  }
}