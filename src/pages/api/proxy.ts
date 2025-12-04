import type { NextApiRequest, NextApiResponse } from "next";
import https from "https";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  // Fetch the external URL (Firebase Storage) via the server
  https.get(url, (externalRes) => {
    // Forward the content type (application/json)
    if (externalRes.headers["content-type"]) {
      res.setHeader("Content-Type", externalRes.headers["content-type"]);
    }
    // Pipe the data directly to the response
    externalRes.pipe(res);
  }).on("error", (e) => {
    console.error("Proxy error:", e);
    res.status(500).json({ error: "Failed to fetch resource" });
  });
}