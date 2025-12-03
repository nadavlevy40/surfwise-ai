import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { prisma } from "@/lib/prisma";
import path from "path";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY || "");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId } = req.body;

  try {
    // 1. Fetch Session Data
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || !session.videoUrls || session.videoUrls.length === 0) {
      return res.status(400).json({ error: "Session or video not found" });
    }

    // 2. Locate the file on the server
    // Note: session.videoUrls[0] is like "/uploads/myvideo.mp4"
    // We need the absolute system path.
    const relativePath = session.videoUrls[0]; 
    const filePath = path.join(process.cwd(), "public", relativePath);

    console.log("Uploading file to Gemini:", filePath);

    // 3. Upload to Google AI File Manager
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: "video/mp4",
      displayName: session.title,
    });

    const fileUri = uploadResponse.file.uri;
    const name = uploadResponse.file.name;

    // 4. Wait for video processing (Poll until state is ACTIVE)
    let file = await fileManager.getFile(name);
    while (file.state === FileState.PROCESSING) {
      console.log("Processing video...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
      file = await fileManager.getFile(name);
    }

    if (file.state === FileState.FAILED) {
      throw new Error("Video processing failed.");
    }

    console.log("Video active. Generating analysis...");

    // 5. Construct Prompt
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `You are a world-class surf coach. 
    Analyze the attached video of a surfer.
    Surfer Profile:
    - Stance: ${session.stance}
    - Skill: ${session.skillLevel}
    - Board: ${session.boardType || "Unknown"}
    - Goals: ${session.goals || "General improvement"}
    
    Output strictly valid JSON with this structure:
    {
      "summary_highlights": ["string", "string"],
      "sections": {
        "takeoff": { "score": number (1-10), "tips": ["string"] },
        "maneuvers": { "score": number (1-10), "tips": ["string"] },
        "style_and_flow": { "score": number (1-10), "tips": ["string"] }
      },
      "drills": {
        "dry_land": ["string"],
        "in_water": ["string"]
      },
      "next_session_checklist": ["string"]
    }
    Do not use markdown formatting like \`\`\`json. Just return the raw JSON string.`;

    // 6. Generate Content (Multimodal: Video URI + Text)
    const result = await model.generateContent([
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
      { text: systemPrompt },
    ]);

    const responseText = result.response.text();
    
    // Clean up potential markdown formatting if the model slips up
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "");
    const feedback = JSON.parse(cleanJson);

    // 7. Update Database
    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        feedback, 
        analysisStatus: "completed" 
      }
    });

    // Clean up: delete file from Gemini to save space (optional, but good practice)
    // await fileManager.deleteFile(name);

    res.json({ ok: true, feedback });

  } catch (e: any) {
    console.error("Analysis Error:", e);
    await prisma.session.update({
      where: { id: sessionId },
      data: { analysisStatus: "error" }
    });
    res.status(500).json({ error: e.message });
  }
}