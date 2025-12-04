import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { PayPalButtons } from "@paypal/react-paypal-js";
import useSWR from "swr";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // Import Auth to check Tier

const fetcher = (url: string) => fetch(url).then(r => r.json());

// --- SUB-COMPONENT: LOCKED CARD (The Upsell) ---
const LockedManeuverCard = ({ event }: { event: any }) => {
  const { user } = useAuth();

  return (
    <Card className="relative overflow-hidden border border-gray-200 shadow-sm bg-gray-50 mb-8 h-[300px]">
      {/* BLURRED CONTENT LAYER */}
      <div className="absolute inset-0 blur-md opacity-50 pointer-events-none select-none">
        <div className="grid lg:grid-cols-5 h-full">
          <div className="lg:col-span-3 bg-gray-300 animate-pulse"></div>
          <div className="lg:col-span-2 p-6 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-20 bg-blue-50 rounded border border-blue-100 p-4"></div>
          </div>
        </div>
      </div>

      {/* LOCK OVERLAY */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/40 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm border border-gray-100 w-full">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Unlock Pro Analysis</h3>
          <p className="text-gray-500 text-sm mb-6">
            Get unlimited breakdowns, biomechanics, and frame inspection for <strong>$19/mo</strong>.
          </p>
          
          {/* PAYPAL BUTTONS */}
          <div className="w-full relative z-20">
            <PayPalButtons 
              style={{ layout: "vertical", shape: "pill", label: "subscribe" }}
              createSubscription={(data, actions) => {
                return actions.subscription.create({
                  plan_id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID! 
                });
              }}
              onApprove={async (data, actions) => {
                // Call our backend to verify and update DB
                if (!user) return;
                try {
                  const res = await fetch("/api/paypal/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      subscriptionID: data.subscriptionID,
                      userId: user.uid 
                    })
                  });
                  if (res.ok) {
                    alert("Welcome to Pro! Refreshing...");
                    window.location.reload();
                  }
                } catch (err) {
                  console.error("Verification failed", err);
                }
              }}
            />
          </div>
          
        </div>
      </div>
    </Card>
  );
};

// --- SUB-COMPONENT: SMART MANEUVER CARD (Unchanged Logic, just props) ---
const ManeuverCard = ({ event, videoUrl, telemetry, isPro }: { event: any, videoUrl: string, telemetry: any[], isPro: boolean }) => {
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
          try { captured.push(canvas.toDataURL('image/jpeg')); } catch(e) { }
        }
      }
      setFrames(captured);
    };
    extractFrames();
  }, [videoUrl, event]);

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
      <div className="flex flex-col lg:flex-row lg:h-[420px]">
        
        <div className="w-full lg:w-[55%] bg-black relative group flex-shrink-0 aspect-video lg:aspect-auto">
          {/* SKELETON LIMITATION FOR FREE USERS */}
          {!isPro && (
            <div className="absolute top-2 right-2 z-20">
               <Badge variant="destructive" className="flex gap-1 items-center bg-black/50 hover:bg-black/70 border-0 backdrop-blur">
                 <Lock className="w-3 h-3" /> Biomechanics Locked
               </Badge>
            </div>
          )}

          {staticFrame ? (
             <div className="relative w-full h-full bg-black flex items-center justify-center">
               <img src={staticFrame} alt="Analysis" className="w-full h-full object-contain" />
               <Button onClick={() => setStaticFrame(null)} className="absolute bottom-4 right-4 bg-white text-black hover:bg-gray-200 font-bold shadow-lg">
                 ▶ Resume Video
               </Button>
             </div>
          ) : (
             <>
               <video 
                 ref={videoRef}
                 src={videoUrl}
                 className="w-full h-full object-cover"
                 style={getCropStyle()} // Crop works for everyone, but overlay is hidden
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

            {event.analogy && (
              <div className="flex items-center gap-2 text-sm text-gray-500 italic">
                <span>🧠</span>
                <span>"{event.analogy}"</span>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6">
            <div className="flex justify-between items-end mb-2">
               <p className="text-[10px] text-gray-400 uppercase font-bold">Frame Inspector</p>
               {!isPro && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1"><Lock className="w-3 h-3"/> Limited Res</span>}
            </div>
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
  
  // GET USER TIER
  const { isPro, togglePro } = useAuth(); 

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
          <p className="text-gray-500">Extracting maneuvers, cropping clips, and calculating angles.</p>
        </div>
      </Layout>
    );
  }

  const isNewFormat = s.feedback?.key_events !== undefined;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-20 px-4">
        
        {/* HEADER & TOGGLE (For Demo Purposes) */}
        <div className="text-center py-12 relative">
          <Badge variant="secondary" className="mb-3 px-3 py-1">{new Date(s.createdAt).toLocaleDateString()}</Badge>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{s.title || "Session Analysis"}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            {isNewFormat ? s.feedback?.coach_summary : "Detailed AI breakdown of your session."}
          </p>
          
          {/* DEV TOOL: Toggle Pro Mode */}
          <div className="absolute top-4 right-4">
             <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                <span className="text-xs font-bold text-gray-500">DEV MODE:</span>
                <Button 
                  size="sm" 
                  onClick={togglePro}
                  className={isPro ? "bg-black text-white" : "bg-white text-black border"}
                >
                  {isPro ? "Viewing as PRO" : "Viewing as FREE"}
                </Button>
             </div>
          </div>
        </div>

        {isNewFormat ? (
          <div className="space-y-8">
            <div className="grid gap-10">
              {/* MANEUVER CARDS Logic */}
              {s.feedback?.key_events?.map((event: any, i: number) => {
                // If Pro, show everything.
                // If Free, show only index 0. Lock the rest.
                if (!isPro && i > 0) {
                  return <LockedManeuverCard key={i} event={event} />;
                }
                return (
                  <ManeuverCard 
                    key={i} 
                    event={event} 
                    videoUrl={s.videoUrls[0]} 
                    telemetry={telemetry} 
                    isPro={isPro}
                  />
                );
              })}
            </div>

            {/* UPSELL BANNER (If Free) */}
            {!isPro && (
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-center text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-2">Ready to master your surf?</h3>
                  <p className="text-gray-300 mb-6 max-w-lg mx-auto">Get unlimited breakdowns, frame-by-frame biometrics, and personalized drill plans.</p>
                  <Button className="bg-white text-black hover:bg-gray-100 font-bold px-8 py-6 rounded-full text-lg">
                    Upgrade to Pro
                  </Button>
                </div>
                {/* Decorative blob */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
               {s.feedback?.next_session_focus?.map((tip:string, i:number) => (
                 <Card key={i} className="bg-white border-l-4 border-blue-500 shadow-sm p-5">
                   <div className="flex items-start gap-4">
                     <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-bold text-sm">{i+1}</span>
                     <p className="text-gray-800 font-medium text-sm leading-relaxed">{tip}</p>
                   </div>
                 </Card>
               ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center text-gray-500">
             <p>Legacy format. Please upload a new video.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}