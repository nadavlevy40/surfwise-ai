import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { UploadCloud, CheckCircle2, AlertCircle, Activity, Waves, Dumbbell, Zap, ArrowUpCircle, RotateCw } from "lucide-react";

type FilesState = { videos: File[]; photos: File[] };

// --- 1. SURF TRIVIA DB ---
const SURF_FACTS = [
  "Did you know? The record for the largest wave ever surfed is 86 feet (Sebastian Steudtner, Nazaré).",
  "Pro Tip: Keeping your eyes up and looking down the line improves balance by 40%.",
  "Fun Fact: Polynesian fishermen invented surfing over 3,000 years ago.",
  "Physics Check: A surfboard generates lift similar to an airplane wing.",
  "History: Duke Kahanamoku is considered the father of modern surfing.",
  "Did you know? There are roughly 20 million surfers worldwide.",
  "Pro Tip: Compression is key. The lower your center of gravity, the harder you can turn.",
  "Fun Fact: The longest ride ever recorded was 3 hours and 55 minutes on a tidal bore in Panama.",
  "Biomechanics: Your back knee acts as the 'steering wheel' for your board."
];

// --- 2. CUSTOM BOARD ICONS ---
const BoardIcons = {
  shortboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-12 mx-auto">
      <path d="M12 2C14.5 8 15 18 12 22C9 18 9.5 8 12 2Z" />
    </svg>
  ),
  longboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-12 mx-auto">
      <path d="M12 2C16 4 16 20 12 22C8 20 8 4 12 2Z" />
      <line x1="12" y1="2" x2="12" y2="22" className="opacity-30" />
    </svg>
  ),
  fish: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-12 mx-auto">
      <path d="M12 2C16 7 16 16 12 16L14 22M12 16L10 22C8 16 8 7 12 2Z" />
    </svg>
  ),
  softtop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-12 mx-auto">
      <rect x="9" y="2" width="6" height="20" rx="3" />
    </svg>
  )
};

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<FilesState>({ videos: [], photos: [] });
  
  // State
  const [stance, setStance] = useState("regular");
  const [skill, setSkill] = useState("intermediate");
  const [board, setBoard] = useState("");
  const [goals, setGoals] = useState("");
  const [conditions, setConditions] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing..."); 
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [factIndex, setFactIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate facts while loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % SURF_FACTS.length);
    }, 4000); // New fact every 4 seconds
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  // --- HELPER: Handle File Selection ---
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles?.length) return;
    const file = selectedFiles[0];
    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file.");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setFiles({ videos: [file], photos: [] });
    setError(null);
  };

  // --- BIOMECHANICS ENGINE ---
  const calculateAngle = (a: any, b: any, c: any) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return Math.round(angle);
  };

  const generateSkeletonLog = async (videoFile: File): Promise<File> => {
    setStatus("Booting Vision Engine...");
    setProgress(10);
    
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
        const duration = vid.duration;
        setStatus("Scanning Biomechanics...");
        while (now < duration) {
          vid.currentTime = now;
          await new Promise(r => { vid.onseeked = r; });
          const result = poseLandmarker.detectForVideo(vid, now * 1000);
          if (result.landmarks.length > 0) {
            const lm = result.landmarks[0];
            const leftKneeAngle = calculateAngle(lm[23], lm[25], lm[27]);
            const rightKneeAngle = calculateAngle(lm[24], lm[26], lm[28]);
            fullTelemetry.push({
              time: Number(now.toFixed(2)),
              landmarks: lm, 
              metrics: {
                leftKneeAngle,
                rightKneeAngle,
                compression: Math.min(leftKneeAngle, rightKneeAngle)
              }
            });
          }
          setProgress(20 + Math.round((now / duration) * 30)); 
          now += 0.1; 
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
      setError("Please drag and drop a video first."); return;
    }
    setError(null); 
    setLoading(true);

    try {
      const videoUrls: string[] = [];
      let skeletonUrl = "";
      const mainVideo = files.videos[0];

      const skeletonFile = await generateSkeletonLog(mainVideo);
      
      setStatus("Uploading to Secure Cloud...");
      setProgress(60);
      
      const fdVideo = new FormData(); 
      fdVideo.append("file", mainVideo);
      const resVideo = await fetch("/api/upload", { method: "POST", body: fdVideo });
      if(!resVideo.ok) throw new Error("Video upload failed");
      const jsonVideo = await resVideo.json();
      videoUrls.push(jsonVideo.fileUrl);

      setProgress(80);
      const fdSkeleton = new FormData();
      fdSkeleton.append("file", skeletonFile);
      const resSkeleton = await fetch("/api/upload", { method: "POST", body: fdSkeleton });
      if(!resSkeleton.ok) throw new Error("Telemetry upload failed");
      const jsonSkeleton = await resSkeleton.json();
      skeletonUrl = jsonSkeleton.fileUrl;

      setStatus("Consulting AI Coach...");
      setProgress(90);
      
      const sessionPayload = {
        title: `Session ${new Date().toLocaleDateString()}`,
        userId: "demo-user",
        stance,
        skillLevel: skill,
        boardType: board,
        goals,
        conditions,
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

      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id })
      });

      setProgress(100);
      router.push(`/results/${session.id}`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  // --- 3. PREMIUM LOADING SCREEN (WAVES + FACTS) ---
  if (loading) {
    return (
      <Layout>
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6">
          
          {/* Main Content */}
          <div className="w-full max-w-lg text-center relative z-10">
            {/* Logo Animation */}
            <div className="mb-8 relative">
              <div className="w-24 h-24 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl animate-bounce">
                <span className="text-5xl">🏄‍♂️</span>
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-2 bg-black/10 rounded-full blur-md animate-pulse"></div>
            </div>

            {/* Status Text */}
            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">{status}</h2>
            <p className="text-blue-600 font-bold text-lg mb-8">{progress}% Complete</p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner mb-12">
              <div 
                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full transition-all duration-700 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* Dynamic Fact Card */}
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-blue-50 max-w-md mx-auto transition-all duration-500 transform hover:scale-105">
              <div className="flex items-center gap-2 mb-3 justify-center text-blue-500 font-bold text-xs uppercase tracking-widest">
                <Zap className="w-4 h-4" />
                Surf Knowledge
              </div>
              <p className="text-gray-700 font-medium text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-700" key={factIndex}>
                "{SURF_FACTS[factIndex]}"
              </p>
            </div>
          </div>

          {/* Animated Wave Background */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
            <svg className="relative block w-[200%] h-[200px] animate-wave" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-blue-100 opacity-50"></path>
            </svg>
            <svg className="absolute bottom-0 left-0 w-[200%] h-[200px] animate-wave-slow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-blue-50 opacity-50"></path>
            </svg>
          </div>
          
          <style jsx>{`
            @keyframes wave {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-wave {
              animation: wave 10s linear infinite;
            }
            .animate-wave-slow {
              animation: wave 15s linear infinite reverse;
            }
          `}</style>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        
        {/* HEADER */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">Upload Your Session</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our AI will analyze your video frame-by-frame to generate pro-level insights.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT: UPLOAD ZONE */}
          <div className="lg:col-span-2 space-y-6">
            <Card className={`border-2 border-dashed transition-all duration-300 ${files.videos.length ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>
              <CardContent className="p-0">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer p-10 flex flex-col items-center justify-center min-h-[400px] text-center"
                >
                  <input type="file" accept="video/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files)} />
                  
                  {videoPreview ? (
                    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg group">
                      <video src={videoPreview} className="w-full h-full max-h-[400px] object-cover" autoPlay muted loop />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <div className="bg-white/90 text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg transform group-hover:scale-105 transition-transform">
                          <CheckCircle2 className="w-5 h-5 text-green-600" /> Video Selected
                        </div>
                      </div>
                      <p className="absolute bottom-4 left-0 right-0 text-white text-sm font-medium drop-shadow-md">Click to change video</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UploadCloud className="w-10 h-10 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Drag & Drop or Click to Upload</h3>
                      <p className="text-gray-500 text-sm max-w-xs mx-auto">Supports MP4, MOV, WEBM. <br/> Max file size 50MB.</p>
                      <Button variant="outline" className="mt-4">Select Video</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3 text-red-700 rounded-r-lg"><AlertCircle className="w-5 h-5" /><p>{error}</p></div>}
          </div>

          {/* RIGHT: CONTEXT FORM */}
          <div className="space-y-6">
            <Card className="border-none shadow-lg bg-white">
              <CardContent className="p-6 space-y-6">
                <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                  <Activity className="w-5 h-5 text-blue-600" /> Session Context
                </h3>

                {/* VISUAL BOARD SELECTOR */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Board Type</label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { id: 'Shortboard', icon: BoardIcons.shortboard },
                      { id: 'Longboard', icon: BoardIcons.longboard },
                      { id: 'Fish', icon: BoardIcons.fish },
                      { id: 'Soft Top', icon: BoardIcons.softtop }
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBoard(b.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${board.includes(b.id) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}
                      >
                        <div className="mb-1">{b.icon}</div>
                        <span className="text-[10px] font-bold uppercase">{b.id}</span>
                      </button>
                    ))}
                  </div>
                  <Input 
                    placeholder="Specifics (e.g. 6'0 Pyzel)" 
                    value={board} 
                    onChange={e=>setBoard(e.target.value)} 
                    className="text-sm"
                  />
                </div>

                {/* VISUAL GOAL SELECTOR */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Goal</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: "Generate Speed", icon: <Zap className="w-3 h-3" /> },
                      { label: "Cutbacks", icon: <RotateCw className="w-3 h-3" /> },
                      { label: "Pop-up", icon: <ArrowUpCircle className="w-3 h-3" /> },
                      { label: "Bottom Turn", icon: <Waves className="w-3 h-3" /> },
                      { label: "Style & Flow", icon: <Dumbbell className="w-3 h-3" /> },
                    ].map((g) => (
                      <button
                        key={g.label}
                        onClick={() => setGoals(g.label)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${goals.includes(g.label) ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                      >
                        {g.icon} {g.label}
                      </button>
                    ))}
                  </div>
                  <Input 
                    placeholder="Other goal..." 
                    value={goals} 
                    onChange={e=>setGoals(e.target.value)} 
                    className="text-sm"
                  />
                </div>

                {/* STANCE & SKILL */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stance</label>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      {['regular', 'goofy'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setStance(s)}
                          className={`flex-1 py-1.5 text-xs font-bold capitalize rounded-md transition-all ${stance === s ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Skill</label>
                    <select 
                      value={skill} 
                      onChange={(e) => setSkill(e.target.value)}
                      className="w-full h-[36px] text-xs font-bold border rounded-lg px-2 bg-white"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conditions</label>
                  <Textarea 
                    placeholder="e.g. 3ft choppy, onshore wind..." 
                    value={conditions} 
                    onChange={e=>setConditions(e.target.value)} 
                    className="resize-none h-16 text-sm bg-gray-50 border-gray-200"
                  />
                </div>

                <Button 
                  onClick={handleSubmit} 
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold h-12 shadow-lg transition-all transform hover:scale-[1.02]"
                >
                  Start Pro Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}