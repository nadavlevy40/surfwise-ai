import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { storage } from "@/lib/firebase";
import fs from "fs";

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload parsing error" });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    try {
      // 1. Define destination in Firebase Storage
      // @ts-ignore
      const filePath = file.filepath || file.path;
      // @ts-ignore
      const fileName = `${Date.now()}-${file.originalFilename || 'video.mp4'}`;
      const bucket = storage.bucket();
      const fileUpload = bucket.file(`uploads/${fileName}`);

      // 2. Upload the file
      const buffer = fs.readFileSync(filePath);
      await fileUpload.save(buffer, {
        metadata: { contentType: file.mimetype || 'video/mp4' },
        public: true // Make public so the frontend can play it easily
      });

      // 3. Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/uploads/${fileName}`;

      return res.json({ fileUrl: publicUrl });

    } catch (uploadError: any) {
      console.error("Firebase Storage Upload Error:", uploadError);
      return res.status(500).json({ error: "Failed to upload to storage" });
    }
  });
}