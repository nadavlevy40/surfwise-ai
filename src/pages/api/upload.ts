import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { storage } from "@/lib/firebase";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "ffmpeg-static";

// 1. Configure FFmpeg with the static binary
if (ffmpegInstaller) {
  ffmpeg.setFfmpegPath(ffmpegInstaller);
}

export const config = { api: { bodyParser: false } };

// Helper: Trim video to 15 seconds
const processVideo = (inputPath: string, outputPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime('00:00:00')
      .setDuration(15) // Max 15 seconds
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Increase timeout for video processing
  const form = formidable({ 
    multiples: true, 
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024 // 50MB limit
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Upload Parse Error:", err);
      return res.status(500).json({ error: "Upload parsing error" });
    }

    // Handle array or single file
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // @ts-ignore
    const rawPath = file.filepath || file.path;
    const isVideo = file.mimetype?.startsWith('video/');
    
    // We will upload this path eventually
    let pathForUpload = rawPath;
    // @ts-ignore
    let fileName = `${Date.now()}-${file.originalFilename}`;

    try {
      // 2. FFmpeg Processing (Only for Videos)
      if (isVideo) {
        const processedPath = path.join(path.dirname(rawPath), `trimmed-${path.basename(rawPath)}`);
        console.log("Trimming video...");
        await processVideo(rawPath, processedPath);
        pathForUpload = processedPath; // Switch to the trimmed file
        fileName = `trimmed-${fileName}`;
      }

      // 3. Upload to Firebase Storage
      const bucket = storage.bucket();
      const fileUpload = bucket.file(`uploads/${fileName}`);
      const buffer = fs.readFileSync(pathForUpload);

      await fileUpload.save(buffer, {
        metadata: { contentType: file.mimetype || 'application/octet-stream' },
        public: true 
      });

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/uploads/${fileName}`;

      // Cleanup processed file if it exists
      if (isVideo && fs.existsSync(pathForUpload)) {
        fs.unlinkSync(pathForUpload);
      }

      return res.json({ fileUrl: publicUrl });

    } catch (uploadError: any) {
      console.error("Processing/Upload Error:", uploadError);
      return res.status(500).json({ error: "Failed to process or upload" });
    }
  });
}