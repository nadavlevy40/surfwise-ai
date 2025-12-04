import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// --- SUB-COMPONENT: SMART VIDEO CARD ---
// Handles looping, zooming, and frame extraction for a specific event
const ManeuverCard = ({ event, videoUrl, telemetry }: { event: any, videoUrl: string, telemetry: any[] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [activeFrame, setActiveFrame] = useState<number | null>(null);

  // 1. Generate Filmstrip (Extract 5 frames from the time range)
  useEffect(() => {
    if (!videoUrl || !event.start_time || !event.end_time) return;
    
    const extractFrames = async () => {
      const vid = document.createElement('video');
      vid.src = videoUrl;
      vid.crossOrigin = "anonymous"; // Needed for capturing frames
      vid.muted = true;
      
      await new Promise(r => { vid.onloadeddata = r; });
      
      const captured: string[] = [];
      const duration = event.end_time - event.start_time;
      const step = duration / 4; // 5 frames total

      for (let i = 0; i <= 4; i++) {
        vid.currentTime = event.start_time + (i * step);
        await new Promise(r => { vid.onseeked = r; });
        
        const canvas = document.createElement('canvas');
        canvas.width = 160; // Thumbnail size
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(vid, 0, 0, canvas.width, canvas.height);
        captured.push(canvas.toDataURL('image/jpeg'));
      }
      setFrames(captured);
    };
    
    extractFrames();
  }, [videoUrl, event]);

  // 2. Smart Looping Logic
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    // Loop back to start if we pass end time
    if (t > event.end_time) {
      videoRef.current.currentTime = event.start_time;
      videoRef.current.play();
    }
  };

  // 3. Auto-Crop / Pan Logic (Using Telemetry)
  // Finds the center of mass for this specific timeframe to center the video
  const getCropStyle = () => {
    if (!telemetry || telemetry.length === 0) return {};
    // Find telemetry point roughly in the middle of this maneuver
    const midTime = (event.start_time + event.end_time) / 2;
    const dataPoint = telemetry.find((t:any) => Math.abs(t.time - midTime) < 0.5);
    
    if (dataPoint && dataPoint.landmarks) {
      const hipX = dataPoint.landmarks[23].x * 100; // Left hip X %
      const hipY = dataPoint.landmarks[23].y * 100; // Left hip Y %
      
      // Simple pan: Shift the object-position to center the hip
      return {
        objectPosition: `${hipX}% ${hipY}%`,
        transform: "scale(1.5)" // Mild Zoom
      };
    }
    return {};
  };

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
      <div className="grid md:grid-cols-2">
        {/* LEFT: VISUALS */}
        <div className="bg-black relative group h-64 md:h-auto">
          <video 
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover transition-all duration-500"
            style={getCropStyle()} // <--- AUTO ZOOM MAGIC
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => {
              // Start playing at the specific time
              e.currentTarget.currentTime = event.start_time;
            }}
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => e.currentTarget.pause()}
          />
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {event.start_time}s - {event.end_time}s
          </div>
        </div>

        {/* RIGHT: ANALYSIS */}
        <div className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-xl text-gray-900">{event.title}</h3>
              <Badge className={event.score >= 8 ? "bg-green-500" : event.score >= 5 ? "bg-yellow-500" : "bg-red-500"}>
                Score: {event.score}/10
              </Badge>
            </div>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{event.critique}</p>
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <span className="text-blue-700 font-bold text-xs uppercase tracking-wider block mb-1">Correction</span>
              <p className="text-blue-900 text-sm font-medium">{event.correction}</p>
            </div>
          </div>

          {/* FILMSTRIP (Frame Scroll) */}
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2 uppercase font-semibold">Frame Breakdown</p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {frames.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    if(videoRef.current) {
                      videoRef.current.currentTime = event.start_time + (i * ((event.end_time-event.start_time)/4));
                      videoRef.current.pause(); // Pause to let them study the frame
                    }
                  }}
                  className="relative min-w-[80px] h-[45px] rounded overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all focus:outline-none focus:border-blue-500"
                >
                  <img src={img} alt="frame" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};


// --- MAIN PAGE ---
export default function ResultsPage(){
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { data, isLoading } = useSWR(id ? `/api/sessions?id=${id}` : null, fetcher, { refreshInterval: 2000 });
  const [telemetry, setTelemetry] = useState<any[]>([]);

  // Fetch Telemetry for the Auto-Crop Logic
  useEffect(() => {
    if (data && !Array.isArray(data) && data.skeletonUrl) {
      // Use Proxy to fetch without CORS
      fetch(`/api/proxy?url=${encodeURIComponent(data.skeletonUrl)}`)
        .then(r => r.json())
        .then(json => setTelemetry(json))
        .catch(console.error);
    }
  }, [data]);

  if (!id) return <Layout><p>Missing ID</p></Layout>;
  if (isLoading || !data) return <Layout><div className="flex h-96 items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div></Layout>;
  
  const s = Array.isArray(data) ? data[0] : data;

  if (s.analysisStatus === 'processing') {
    return (
      <Layout>
        <div className="max-w-xl mx-auto mt-20 text-center space-y-6">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="text-3xl font-bold">Analyzing your Surfing...</h2>
          <p className="text-gray-500">Extracting maneuvers, cropping clips, and calculating angles.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {/* HEADER */}
        <div className="text-center py-8">
          <Badge variant="outline" className="mb-2">{new Date(s.createdAt).toLocaleDateString()}</Badge>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{s.title || "Surf Session Analysis"}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">{s.feedback?.coach_summary}</p>
        </div>

        {/* MANEUVER CARDS (The New Feature) */}
        <div className="space-y-8">
          {s.feedback?.key_events?.map((event: any, i: number) => (
            <ManeuverCard 
              key={i} 
              event={event} 
              videoUrl={s.videoUrls[0]} 
              telemetry={telemetry} // Pass telemetry for auto-crop
            />
          ))}
        </div>

        {/* CHECKLIST */}
        <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white border-none">
          <CardHeader><CardTitle>Next Session Focus</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid md:grid-cols-2 gap-4">
              {s.feedback?.next_session_focus?.map((tip:string, i:number) => (
                <li key={i} className="flex gap-3 items-center bg-white/10 p-3 rounded-lg">
                  <span className="w-6 h-6 flex items-center justify-center bg-blue-500 rounded-full text-xs font-bold">{i+1}</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}