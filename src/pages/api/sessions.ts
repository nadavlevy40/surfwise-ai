import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { id } = req.query;
    if (id) {
      const s = await prisma.session.findUnique({ where: { id: String(id) } });
      return res.json(s ?? { error: "Not found" });
    }
    const sessions = await prisma.session.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(sessions);
  }

  if (req.method === "POST") {
    const data = req.body;
    const s = await prisma.session.create({ data });
    return res.json(s);
  }

  if (req.method === "PATCH") {
    const { id, ...data } = req.body;
    const s = await prisma.session.update({ where: { id }, data });
    return res.json(s);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
