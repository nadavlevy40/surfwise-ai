import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FilesState = { videos: File[]; photos: File[] };

export default function UploadPage() {
  const [files, setFiles] = useState<FilesState>({ videos: [], photos: [] });
  const [stance, setStance] = useState("regular");
  const [skill, setSkill] = useState("intermediate");
  const [board, setBoard] = useState("");
  const [goals, setGoals] = useState("");
  const [conditions, setConditions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null); setLoading(true);

    // 1) upload files
    const uploads: string[] = [];
    for (const f of [...files.videos, ...files.photos]) {
      const fd = new FormData(); fd.append("file", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json(); 
      
    }
  };
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Upload Your Surf Session</h1>
          <p className="text-gray-600">Add videos and photos, tell us about your goals, and get personalized coaching feedback.</p>
        </div>

        {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">{error}</div>}

        <Card className="border-none shadow">
          <CardHeader><CardTitle>Upload Media</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept="video/*,image/*" multiple onChange={(e)=>onSelect(e.target.files)} />
            <div className="space-y-2">
              {files.videos.map((f,i)=>(
                <div key={"v"+i} className="flex justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <span>{f.name}</span>
                  <button onClick={()=>removeFile("videos", i)}>✖</button>
                </div>
              ))}
              {files.photos.map((f,i)=>(
                <div key={"p"+i} className="flex justify-between p-2 bg-cyan-50 rounded border border-cyan-200">
                  <span>{f.name}</span>
                  <button onClick={()=>removeFile("photos", i)}>✖</button>
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
                <label className="block text-sm mb-1">Stance</label>
                <select value={stance} onChange={(e)=>setStance(e.target.value)} className="w-full border rounded-md h-10 px-3">
                  <option value="regular">Regular</option>
                  <option value="goofy">Goofy</option>
                  <option value="unknown">Not sure</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Skill Level</label>
                <select value={skill} onChange={(e)=>setSkill(e.target.value)} className="w-full border rounded-md h-10 px-3">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Board Type and Length</label>
              <Input value={board} onChange={(e)=>setBoard(e.target.value)} placeholder="e.g., Shortboard 6'2, Longboard 9'0" />
            </div>
            <div>
              <label className="block text-sm mb-1">What are you working on?</label>
              <Input value={goals} onChange={(e)=>setGoals(e.target.value)} placeholder="e.g., Pop-up speed, bottom turns, speed generation" />
            </div>
            <div>
              <label className="block text-sm mb-1">Wave Conditions (optional)</label>
              <Textarea value={conditions} onChange={(e)=>setConditions(e.target.value)} rows={2} placeholder="e.g., 3-4 ft, clean, beach break" />
            </div>
          </CardContent>
        </Card>

        <Button disabled={loading} className="w-full h-12">{loading? "Analyzing..." : "Analyze My Session"}</Button>
      </div>
    </Layout>
  );
}
