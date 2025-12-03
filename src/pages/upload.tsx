import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FilesState = { videos: File[]; photos: File[] };

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FilesState>({ videos: [], photos: [] });
  const [stance, setStance] = useState("regular");
  const [skill, setSkill] = useState("intermediate");
  const [board, setBoard] = useState("");
  const [goals, setGoals] = useState("");
  const [conditions, setConditions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(""); // To show specific progress steps

  const onSelect = (selected: FileList | null) => {
    if (!selected) return;
    const list = Array.from(selected);
    const vids = list.filter(f => f.type.startsWith("video/"));
    const imgs = list.filter(f => f.type.startsWith("image/"));
    setFiles(prev => ({ videos: [...prev.videos, ...vids], photos: [...prev.photos, ...imgs] }));
  };

  const removeFile = (type: "videos" | "photos", index: number) => {
    setFiles(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (files.videos.length === 0 && files.photos.length === 0) {
      setError("Please upload at least one video or photo"); return;
    }
    setError(null); 
    setLoading(true);

    try {
      // 1. Upload files to local server
      setStatus("Uploading media...");
      const videoUrls: string[] = [];
      const photoUrls: string[] = [];

      for (const f of [...files.videos]) {
        const fd = new FormData(); fd.append("file", f);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        if (!r.ok) throw new Error("Video upload failed");
        const j = await r.json();
        videoUrls.push(j.fileUrl);
      }
      
      // (Simplified: we handle photos similarly, but focusing on video for now)
      for (const f of [...files.photos]) {
        const fd = new FormData(); fd.append("file", f);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        if (!r.ok) throw new Error("Photo upload failed");
        const j = await r.json();
        photoUrls.push(j.fileUrl);
      }

      // 2. Create Session in DB
      setStatus("Creating session...");
      const sessionPayload = {
        title: `Session ${new Date().toLocaleDateString()}`,
        userId: "demo-user-123", // Placeholder until Auth is set up
        stance,
        skillLevel: skill,
        boardType: board,
        goals,
        conditions,
        videoUrls,
        photoUrls,
        analysisStatus: 'processing'
      };

      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload)
      });
      
      if (!sessionRes.ok) throw new Error("Failed to create session");
      const session = await sessionRes.json();

      // 3. Trigger AI Analysis
      setStatus("AI Coach is watching your video...");
      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id })
      });

      // 4. Redirect
      router.push(`/results/${session.id}`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Upload Your Surf Session</h1>
          <p className="text-gray-600">Add videos, set your goals, and let Gemini analyze your technique.</p>
        </div>

        {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">{error}</div>}

        <Card className="border-none shadow">
          <CardHeader><CardTitle>Upload Media</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept="video/*,image/*" multiple onChange={(e)=>onSelect(e.target.files)} />
            <div className="space-y-2">
              {files.videos.map((f,i)=>(
                <div key={"v"+i} className="flex justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="truncate">{f.name}</span>
                  <button onClick={()=>removeFile("videos", i)} className="text-red-500">✖</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow">
          <CardHeader><CardTitle>Session Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 font-medium">Stance</label>
                <select value={stance} onChange={(e)=>setStance(e.target.value)} className="w-full border rounded-md h-10 px-3 bg-white">
                  <option value="regular">Regular (Left foot forward)</option>
                  <option value="goofy">Goofy (Right foot forward)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Skill Level</label>
                <select value={skill} onChange={(e)=>setSkill(e.target.value)} className="w-full border rounded-md h-10 px-3 bg-white">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">Board Details</label>
              <Input value={board} onChange={(e)=>setBoard(e.target.value)} placeholder="e.g., Pyzel Ghost 6'0" />
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">What are you working on?</label>
              <Input value={goals} onChange={(e)=>setGoals(e.target.value)} placeholder="e.g., Generating speed, cutbacks" />
            </div>
          </CardContent>
        </Card>

        <Button disabled={loading} onClick={handleSubmit} className="w-full h-12 text-lg">
          {loading ? status : "Analyze My Session"}
        </Button>
      </div>
    </Layout>
  );
}