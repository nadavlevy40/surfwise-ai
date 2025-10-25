import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({ multiples: false, uploadDir, keepExtensions: true });
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload error" });
    // For demo, we return a local URL. In production, use S3 and return signed URL.
    const file = files.file as formidable.File;
    const url = `/uploads/${path.basename(file.filepath)}`;
    return res.json({ fileUrl: url });
  });
}
