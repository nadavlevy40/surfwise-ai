import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const ManeuverCard = ({ event, videoUrl, telemetry }: { event: any, videoUrl: string, telemetry: any[] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [staticFrame, setStaticFrame] = useState<string | null>(null);
  const [debugTime, setDebugTime] = useState(0);

  // 1. Force Start Time (Fixes "Duplicate Video" bug)
  useEffect(() => {
    if (videoRef.current && event.start_time !== undefined) {
      // Small delay to ensure video is ready to seek
      setTimeout(() => {
        if(videoRef.current) {
          videoRef.current.currentTime = event.start_time;
        }
      }, 500);
    }
  }, [event.start_time]);

  // 2. Generate Filmstrip (Now works thanks to updated Proxy)
  useEffect(() => {
    if (!videoUrl || event.start_time === undefined || event.end_time === undefined) return;
    
    const extractFrames = async () => {
      const vid = document.createElement('video');
      // Append random ID to prevent browser caching conflicts
      vid.src = `/api/proxy?url=${encodeURIComponent(videoUrl)}&t=${Date.now()}`;
      vid.crossOrigin = "anonymous"; 
      vid.muted = true;
      
      await new Promise((resolve) => { 
        vid.onloadeddata = resolve;
        vid.onerror = () => resolve(null); // Fail gracefully
      });
      
      const captured: string[] = [];
      const duration = event.end_time - event.start_time;
      // If duration is 0 (AI error), default to 2 seconds
      const validDuration = duration > 0 ? duration : 2; 
      const frameCount = 10; 
      const step = validDuration / (frameCount - 1);

      for (let i = 0; i < frameCount; i++) {
        vid.currentTime = event.start_time + (i * step);
        await new Promise(r => { vid.onseeked = r; });
        
        const canvas = document.createElement('canvas');
        canvas.width = 320; 
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          try {
            captured.push(canvas.toDataURL('image/jpeg'));
          } catch(e) {
            console.warn("Frame blocked by browser security");
          }
        }
      }
      setFrames(captured);
    };
    
    extractFrames();
  }, [videoUrl, event]);

  // 3. Robust Loop Logic
  const handleTimeUpdate = () => {
    if (!videoRef.current || staticFrame) return; 
    const t = videoRef.current.currentTime;
    setDebugTime(t); // For debugging visually

    // If we drift past end time, SNAP back to start
    if (t >= event.end_time) {
      videoRef.current.currentTime = event.start_time;
      videoRef.current.play();
    }
    // If we drifted before start time (weird browser seek behavior), SNAP forward
    if (t < event.start_time - 0.5) {
      videoRef.current.currentTime = event.start_time;
    }
  };

  const getCropStyle = () => {
    if (!telemetry || telemetry.length === 0) return {};
    const midTime = (event.start_time + event.end_time) / 2;
    const dataPoint = telemetry.find((t:any) => Math.abs(t.time - midTime) < 0.5);
    
    if (dataPoint && dataPoint.landmarks) {
      const hipX = dataPoint.landmarks[23].x * 100; 
      const hipY = dataPoint.landmarks[23].y * 100; 
      return {
        objectPosition: `${hipX}% ${hipY}%`,
        transform: "scale(1.4)" 
      };
    }
    return {};
  };

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-lg bg-white">
      <div className="grid lg:grid-cols-5 h-full">
        
        {/* LEFT: MEDIA PLAYER */}
        <div className="lg:col-span-3 bg-black relative group min-h-[300px] lg:min-h-[400px]">
          {staticFrame ? (
             <div className="relative w-full h-full bg-black flex items-center justify-center">
               <img src={staticFrame} alt="Analysis Frame" className="w-full h-full object-contain" />
               <button 
                 onClick={() => setStaticFrame(null)}
                 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600/90 hover:bg-blue-600 text-white rounded-full px-6 py-3 font-bold shadow-2xl backdrop-blur-sm transition-all"
               >
                 ▶ Resume Loop
               </button>
             </div>
          ) : (
             <video 
               ref={videoRef}
               src={videoUrl} // Direct URL for playback (smoother than proxy)
               className="w-full h-full object-cover"
               style={getCropStyle()}
               muted
               playsInline
               onTimeUpdate={handleTimeUpdate}
               onLoadedMetadata={(e) => { e.currentTarget.currentTime = event.start_time; }}
               onMouseEnter={(e) => e.currentTarget.play()}
             />
          )}
          
          {/* Debug/Info Badge */}
          <div className="absolute bottom-4 left-4 flex gap-2">
             <span className="bg-black/60 backdrop-blur text-white text-xs font-mono px-3 py-1 rounded-full border border-white/20">
               Loop: {event.start_time}s - {event.end_time}s
             </span>
             {/* Use this to check if player is actually working */}
             <span className="bg-red-500/80 text-white text-xs font-mono px-2 py-1 rounded-full">
               Now: {debugTime.toFixed(1)}s
             </span>
          </div>
        </div>

        {/* RIGHT: COACHING INTEL */}
        <div className="lg:col-span-2 p-6 flex flex-col h-full border-l border-gray-100 bg-gray-50/50">
          <div className="flex-grow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-extrabold text-2xl text-gray-900 tracking-tight">{event.title}</h3>
              <div className={`px-3 py-1 rounded-lg font-bold text-sm ${event.score >= 8 ? "bg-green-100 text-green-700" : event.score >= 5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                {event.score}/10
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Analysis</span>
                <p className="text-gray-700 text-sm leading-relaxed mt-1">{event.critique}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                <span className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
                  <span>💡</span> Pro Correction
                </span>
                <p className="text-gray-900 font-medium text-sm">{event.correction}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-end mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase">Frame Inspector</p>
              <span className="text-[10px] text-gray-400">Tap to examine</span>
            </div>
            {frames.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {frames.map((img, i) => (
                  <button 
                    key={i} 
                    onClick={() => setStaticFrame(img)}
                    className={`relative min-w-[80px] h-[50px] rounded-lg overflow-hidden border-2 transition-all shadow-sm flex-shrink-0 ${staticFrame === img ? 'border-blue-500 scale-105 ring-2 ring-blue-200' : 'border-white hover:border-gray-300'}`}
                  >
                    <img src={img} alt={`frame-${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-[50px] flex items-center justify-center bg-gray-100 rounded text-xs text-gray-400 border border-dashed border-gray-300">
                Loading frames...
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default function ResultsPage(){
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { data, isLoading } = useSWR(id ? `/api/sessions?id=${id}` : null, fetcher, { refreshInterval: 2000 });
  const [telemetry, setTelemetry] = useState<any[]>([]);

  useEffect(() => {
    if (data && !Array.isArray(data) && data.skeletonUrl) {
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

  const isNewFormat = s.feedback?.key_events !== undefined;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-10 pb-24">
        <div className="text-center py-10">
          <Badge variant="secondary" className="mb-3 px-3 py-1">{new Date(s.createdAt).toLocaleDateString()}</Badge>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">{s.title || "Session Analysis"}</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {isNewFormat ? s.feedback?.coach_summary : "Detailed AI breakdown of your session."}
          </p>
        </div>

        {isNewFormat ? (
          <div className="space-y-12">
            <div className="grid gap-10">
              {s.feedback?.key_events?.map((event: any, i: number) => (
                <ManeuverCard 
                  key={i} 
                  event={event} 
                  videoUrl={s.videoUrls[0]} 
                  telemetry={telemetry} 
                />
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
               {s.feedback?.next_session_focus?.map((tip:string, i:number) => (
                 <Card key={i} className="bg-white border-l-4 border-blue-500 shadow-md">
                   <CardContent className="pt-6">
                     <div className="flex items-center gap-3 mb-3">
                       <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full font-bold text-sm">{i+1}</span>
                       <h4 className="font-bold text-gray-900">Focus Area</h4>
                     </div>
                     <p className="text-gray-700 font-medium">{tip}</p>
                   </CardContent>
                 </Card>
               ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl aspect-video mx-auto max-w-4xl">
                <video src={s.videoUrls[0]} className="w-full h-full object-contain" controls />
             </div>
             <p className="text-center text-gray-500 italic">This session uses the legacy analysis format.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}