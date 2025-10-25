import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    stance = 'unknown',
    skill = 'intermediate',
    board = '',
    goals = '',
    conditions = '',
    mediaType = 'Video(s) only',
    videoTimestamps = [],
    photos = [],
    coachNotes = ''
  } = req.body;

  const systemPrompt = `
You are a professional surf coach. Your job is to give clear, friendly, practical feedback.
Audience: average surfers who want actionable guidance—not technical biomechanics.
Style: positive, concise, encouraging, no jargon unless necessary.
Never output angles or raw measurements unless the user asks for advanced details.
Always include: 3–5 highlight bullets (top summary), targeted tips grouped by skill area, 2–3 simple drills for next session, and safety/etiquette reminders when relevant.
When videos are provided, reference timestamps (e.g., “00:12–00:16: you stand too tall”).
When photos are provided, reference the image index (e.g., “Photo #3: your front arm isn’t leading”).
If both are provided, prefer timestamp callouts and add image notes where useful.
If something is unclear due to quality, say so briefly and give best-effort advice.
Avoid medical advice.
Keep total output tight and readable.

Use the schema provided at the end of this prompt.
`;

  const userPrompt = `
SESSION CONTEXT
- Stance: ${stance}
- Skill: ${skill}
- Board: ${board}
- Goals: ${goals}
- Conditions: ${conditions}

INPUT
- Media: ${mediaType}
- Video timeline: ${videoTimestamps.length ? videoTimestamps.join(', ') : 'N/A'}
- Photos: ${photos.length ? photos.map((p, i) => `Photo #${i + 1}`).join(', ') : 'N/A'}
- Any coach notes from user: ${coachNotes || 'None'}

RESPONSE REQUIREMENTS
- Use the JSON schema below.
- Keep language plain and positive, with specific corrections.
- Use timestamp references for videos (mm:ss format).
- Use “Photo #N” for photos.
- Include 2–3 dry-land drills and 2–3 in-water drills tailored to the issues.
- Add a short “What to practice next session” checklist.

Required JSON Output Schema:
{
  "summary_highlights": ["string (max 120 chars per item, 3-5 items)"],
  "sections": {
    "takeoff": { "tips": ["string"] },
    "stance_and_balance": { "tips": ["string"] },
    "line_selection": { "tips": ["string"] },
    "bottom_turn": { "tips": ["string"] },
    "top_turn": { "tips": ["string"] },
    "speed_management": { "tips": ["string"] },
    "safety_and_etiquette": { "tips": ["string"] }
  },
  "moments": [
    { "type": "video", "timecode": "mm:ss-mm:ss", "note": "string (<= 140 chars)" },
    { "type": "photo", "photo_index": 3, "note": "string (<= 140 chars)" }
  ],
  "drills": {
    "dry_land": ["string"],
    "in_water": ["string"]
  },
  "next_session_checklist": ["string"],
  "tone_tags": ["encouraging", "practical", "clear"]
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: 'json'
    });

    const feedback = completion.choices[0].message?.content;
    return res.status(200).json({ feedback: JSON.parse(feedback ?? '{}') });
  } catch (error) {
    console.error('OpenAI error:', error);
    return res.status(500).json({ error: 'Failed to generate surf feedback.' });
  }
}
