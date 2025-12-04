import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const ManeuverCard = ({ event, videoUrl, telemetry }: { event: any, videoUrl: string, telemetry: any[] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [staticFrame, setStaticFrame] = useState<string | null>(null);

  // 1. Force Start Time
  useEffect(() => {
    if (videoRef.current && event.start_time !== undefined) {
      setTimeout(() => {
        if(videoRef.current) videoRef.current.currentTime = event.start_time;
      }, 500);
    }
  }, [event.start_time]);

  // 2. Generate Filmstrip
  useEffect(() => {
    if (!videoUrl || event.start_time === undefined || event.end_time === undefined) return;
    
    const extractFrames = async () => {
      const vid = document.createElement('video');
      vid.src = `/api/proxy?url=${encodeURIComponent(videoUrl)}&t=${Date.now()}`;
      vid.crossOrigin = "anonymous"; 
      vid.muted = true;
      
      await new Promise((resolve) => { 
        vid.onloadeddata = resolve;
        vid.onerror = () => resolve(null);
      });
      
      const captured: string[] = [];
      const duration = event.end_time - event.start_time;
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
          } catch(e) { }
        }
      }
      setFrames(captured);
    };
    extractFrames();
  }, [videoUrl, event]);

  // 3. Loop Logic
  const handleTimeUpdate = () => {
    if (!videoRef.current || staticFrame) return; 
    const t = videoRef.current.currentTime;
    if (t >= event.end_time) {
      videoRef.current.currentTime = event.start_time;
      videoRef.current.play();
    }
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
      return { objectPosition: `${hipX}% ${hipY}%`, transform: "scale(1.4)" };
    }
    return {};
  };

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm bg-white mb-8">
      {/* Container: Flex Column on Mobile, Row on Desktop. Fixed Height on Desktop. */}
      <div className="flex flex-col lg:flex-row lg:h-[420px]">
        
        {/* LEFT: MEDIA PLAYER - Forces 16:9 Aspect Ratio on Mobile, Fill on Desktop */}
        <div className="w-full lg:w-[55%] bg-black relative group flex-shrink-0 aspect-video lg:aspect-auto">
          {staticFrame ? (
             <div className="relative w-full h-full bg-black flex items-center justify-center">
               <img src={staticFrame} alt="Analysis" className="w-full h-full object-contain" />
               <Button 
                 onClick={() => setStaticFrame(null)}
                 className="absolute bottom-4 right-4 bg-white text-black hover:bg-gray-200 font-bold shadow-lg"
               >
                 ▶ Resume Video
               </Button>
               <div className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow uppercase">
                 Static View
               </div>
             </div>
          ) : (
             <>
               <video 
                 ref={videoRef}
                 src={videoUrl}
                 className="w-full h-full object-cover"
                 style={getCropStyle()}
                 muted
                 playsInline
                 onTimeUpdate={handleTimeUpdate}
                 onLoadedMetadata={(e) => { e.currentTarget.currentTime = event.start_time; }}
                 onMouseEnter={(e) => e.currentTarget.play()}
               />
               <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-[10px] font-mono px-2 py-1 rounded border border-white/10">
                 {event.start_time}s - {event.end_time}s
               </div>
             </>
          )}
        </div>

        {/* RIGHT: CONTENT */}
        <div className="flex-1 p-6 flex flex-col h-full overflow-y-auto bg-slate-50">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-2xl text-gray-900">{event.title}</h3>
              <Badge className={event.score >= 8 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                {event.score}/10
              </Badge>
            </div>
            
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              {event.critique}
            </p>
            
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm mb-2">
              <span className="text-blue-600 font-bold text-xs uppercase tracking-wider block mb-1">Coach's Fix</span>
              <p className="text-gray-900 font-medium text-sm">{event.correction}</p>
            </div>

            {/* NEW: ANALOGY SECTION */}
            {event.analogy && (
              <div className="flex items-center gap-2 text-sm text-gray-500 italic">
                <span>🧠</span>
                <span>"{event.analogy}"</span>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6">
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Frame Inspector</p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {frames.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => setStaticFrame(img)}
                  className={`
                    relative min-w-[70px] h-[40px] rounded-md overflow-hidden border-2 transition-all 
                    ${staticFrame === img ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400'}
                  `}
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
  if (isLoading || !data) return <Layout><div className="flex h-screen items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div></Layout>;
  
  const s = Array.isArray(data) ? data[0] : data;

  if (s.analysisStatus === 'processing') {
    return (
      <Layout>
        <div className="max-w-xl mx-auto mt-20 text-center space-y-6">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="text-2xl font-bold text-gray-900">Analysing your Surfing...</h2>
          <p className="text-gray-500">Extracting maneuvers, physics & visuals.</p>
        </div>
      </Layout>
    );
  }

  const isNewFormat = s.feedback?.key_events !== undefined;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-20 px-4">
        <div className="text-center py-12">
          <Badge variant="secondary" className="mb-3 px-3 py-1">{new Date(s.createdAt).toLocaleDateString()}</Badge>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{s.title || "Session Analysis"}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isNewFormat ? s.feedback?.coach_summary : "Detailed AI breakdown of your session."}
          </p>
        </div>

        {isNewFormat ? (
          <div className="space-y-8">
            <div>
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
                 <Card key={i} className="bg-white border-l-4 border-blue-500 shadow-sm p-5 hover:shadow-md transition-shadow">
                   <div className="flex items-start gap-4">
                     <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full font-bold text-sm border border-blue-100">{i+1}</span>
                     <p className="text-gray-800 font-medium text-sm leading-relaxed">{tip}</p>
                   </div>
                 </Card>
               ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center text-gray-500">
             <p>Legacy format. Please upload a new video to see the Pro Dashboard.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}