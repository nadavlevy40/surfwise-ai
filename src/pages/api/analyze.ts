import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { prisma } from "@/lib/prisma";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { sessionId, payload } = req.body as { sessionId: string; payload: any };

    const systemPrompt = `You are a professional surf coach. Provide clear, friendly, practical feedback.
Audience: average surfers; avoid heavy biomechanics. 
Always include: 3–5 highlight bullets, grouped tips (takeoff, stance_and_balance, line_selection, bottom_turn, top_turn, speed_management, safety_and_etiquette), 2–3 dry-land drills, 2–3 in-water drills, and a next-session checklist. 
Use timestamps if available; else keep it general.`;

    const userPrompt = `SESSION CONTEXT
- Stance: ${payload.stance}
- Skill: ${payload.skillLevel}
- Board: ${payload.boardType || "Not specified"}
- Goals: ${payload.goals || "General improvement"}
- Conditions: ${payload.conditions || "Not specified"}
- Media: ${payload.mediaSummary}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const json = JSON.parse(response.choices[0].message.content || "{}");

    await prisma.session.update({
      where: { id: sessionId },
      data: { feedback: json, analysisStatus: "completed" }
    });

    res.json({ ok: true, feedback: json });
  } catch (e:any) {
    console.error(e);
    await prisma.session.update({
      where: { id: req.body.sessionId },
      data: { analysisStatus: "error" }
    });
    res.status(500).json({ error: "Analysis failed" });
  }
}
