# Surf Coach AI (Next.js + Prisma)

## Quickstart
```bash
npm i
npm run prisma:generate
npm run prisma:migrate
cp .env.example .env
# set your OPENAI_API_KEY in .env
npm run dev
```

Open http://localhost:3000

## Notes
- Uploads save to `public/uploads` locally (demo only). For production, swap to S3 or Supabase.
- Prisma uses SQLite locally. You can switch `DATABASE_URL` to Postgres when deploying.
- The analysis endpoint calls OpenAI with a coaching system prompt and expects JSON feedback (summary_highlights, sections, drills, next_session_checklist).
