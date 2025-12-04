import { useState, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

type FilesState = { videos: File[]; photos: File[] };

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FilesState>({ videos: [], photos: [] });
  const [stance, setStance] = useState("regular");
  const [skill, setSkill] = useState("intermediate");
  const [board, setBoard] = useState("");
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(""); 
  const [error, setError] = useState<string | null>(null);

  const onSelect = (selected: FileList | null) => {
    if (!selected) return;
    const list = Array.from(selected);
    const vids = list.filter(f => f.type.startsWith("video/"));
    const imgs = list.filter(f => f.type.startsWith("image/"));
    setFiles(prev => ({ videos: [...prev.videos, ...vids], photos: [...prev.photos, ...imgs] }));
  };

  // --- BIOMECHANICS MATH ---
  const calculateAngle = (a: any, b: any, c: any) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return Math.round(angle);
  };

  // --- MEDIAPIPE LOGIC ---
  const generateSkeletonLog = async (videoFile: File): Promise<File> => {
    setStatus("Extracting visual telemetry...");
    
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO"
    });

    return new Promise((resolve) => {
      const url = URL.createObjectURL(videoFile);
      const vid = document.createElement("video");
      vid.src = url;
      vid.muted = true;
      
      vid.onloadeddata = async () => {
        const fullTelemetry = [];
        let now = 0;
        
        while (now < vid.duration) {
          vid.currentTime = now;
          await new Promise(r => { vid.onseeked = r; });
          
          const result = poseLandmarker.detectForVideo(vid, now * 1000);
          
          if (result.landmarks.length > 0) {
            const lm = result.landmarks[0];
            
            // Calculate angles
            // Keypoint Indices: Hip(23/24), Knee(25/26), Ankle(27/28)
            const leftKneeAngle = calculateAngle(lm[23], lm[25], lm[27]);
            const rightKneeAngle = calculateAngle(lm[24], lm[26], lm[28]);

            fullTelemetry.push({
              time: Number(now.toFixed(2)),
              // IMPORTANT: We save as 'landmarks' for the Overlay to read
              landmarks: lm, 
              // IMPORTANT: We save 'metrics' for the Live Score box
              metrics: {
                leftKneeAngle,
                rightKneeAngle,
                compression: Math.min(leftKneeAngle, rightKneeAngle)
              }
            });
          }
          now += 0.1; // 10fps capture
        }
        
        const jsonString = JSON.stringify(fullTelemetry);
        const blob = new Blob([jsonString], { type: "application/json" });
        const jsonFile = new File([blob], "telemetry_log.json", { type: "application/json" });
        
        resolve(jsonFile);
      };
    });
  };

  const handleSubmit = async () => {
    if (files.videos.length === 0) {
      setError("Please upload a video"); return;
    }
    setError(null); 
    setLoading(true);

    try {
      const videoUrls: string[] = [];
      let skeletonUrl = "";

      const mainVideo = files.videos[0];
      const skeletonFile = await generateSkeletonLog(mainVideo);

      setStatus("Uploading video...");
      const fdVideo = new FormData(); 
      fdVideo.append("file", mainVideo);
      const resVideo = await fetch("/api/upload", { method: "POST", body: fdVideo });
      if(!resVideo.ok) throw new Error("Video upload failed");
      const jsonVideo = await resVideo.json();
      videoUrls.push(jsonVideo.fileUrl);

      setStatus("Uploading telemetry...");
      const fdSkeleton = new FormData();
      fdSkeleton.append("file", skeletonFile);
      const resSkeleton = await fetch("/api/upload", { method: "POST", body: fdSkeleton });
      if(!resSkeleton.ok) throw new Error("Telemetry upload failed");
      const jsonSkeleton = await resSkeleton.json();
      skeletonUrl = jsonSkeleton.fileUrl;

      setStatus("Creating session...");
      const sessionPayload = {
        title: `Pro Session ${new Date().toLocaleDateString()}`,
        userId: "demo-user",
        stance,
        skillLevel: skill,
        boardType: board,
        goals,
        videoUrls,
        skeletonUrl, 
        analysisStatus: 'processing'
      };

      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload)
      });
      const session = await sessionRes.json();

      setStatus("Gemini Pro 2.5 is analyzing...");
      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id })
      });

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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Pro Analysis Upload</h1>
          <p className="text-gray-600">We extract biomechanics (knee angles) for precision feedback.</p>
        </div>
        
        {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

        <Card>
          <CardHeader><CardTitle>Video Upload</CardTitle></CardHeader>
          <CardContent>
            <Input type="file" accept="video/*" onChange={(e)=>onSelect(e.target.files)} />
            {files.videos.length > 0 && <p className="mt-2 text-green-600">✓ {files.videos[0].name} selected</p>}
          </CardContent>
        </Card>

        <Card>
           <CardHeader><CardTitle>Context</CardTitle></CardHeader>
           <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <select className="border p-2 rounded" value={stance} onChange={e=>setStance(e.target.value)}>
                 <option value="regular">Regular</option>
                 <option value="goofy">Goofy</option>
               </select>
               <select className="border p-2 rounded" value={skill} onChange={e=>setSkill(e.target.value)}>
                 <option value="intermediate">Intermediate</option>
                 <option value="advanced">Advanced</option>
               </select>
             </div>
             <Input placeholder="Current Goal (e.g. Cutbacks)" value={goals} onChange={e=>setGoals(e.target.value)} />
           </CardContent>
        </Card>

        <Button disabled={loading} onClick={handleSubmit} className="w-full h-12">
          {loading ? status : "Start Pro Analysis"}
        </Button>
      </div>
    </Layout>
  );
}