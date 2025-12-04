import { useRouter } from "next/router";
import useSWR from "swr";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ResultsPage(){
  const router = useRouter();
  const { id } = router.query as { id: string };
  // Poll every 2 seconds to check for updates
  const { data, isLoading } = useSWR(id ? `/api/sessions?id=${id}` : null, fetcher, { refreshInterval: 2000 });

  if (!id) return <Layout><p>Missing session id.</p></Layout>;
  if (isLoading || !data) return <Layout><p className="text-center mt-10">Loading session...</p></Layout>;
  if (data.error) return <Layout><p className="text-center mt-10 text-red-500">Error: {data.error}</p></Layout>;

  // Normalize data (handle array vs object)
  const s = Array.isArray(data) ? data[0] : data;

  // 1. Handle Error Status
  if (s.analysisStatus === 'error') {
    return (
      <Layout>
        <div className="max-w-xl mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">Analysis Failed</h2>
          <p className="text-gray-600 mb-4">Something went wrong while analyzing your video.</p>
          <Button onClick={() => router.push('/upload')}>Try Again</Button>
        </div>
      </Layout>
    );
  }

  // 2. Handle Processing Status
  if (s.analysisStatus === 'processing') {
    return (
      <Layout>
         <div className="max-w-xl mx-auto mt-20 text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-2xl font-bold">Analyzing your surf...</h2>
            <p className="text-gray-500">The AI is watching your video. This usually takes 10-20 seconds.</p>
         </div>
      </Layout>
    );
  }

  // 3. Show Results (Completed)
  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{s.title}</h1>
            <p className="text-gray-600">{new Date(s.createdAt).toLocaleDateString()} • {s.stance} • {s.skillLevel}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Share</Button>
            <Button>Download PDF</Button>
          </div>
        </div>

        {/* Coach Summary */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader><CardTitle>Coach Summary</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {s.feedback?.summary_highlights?.map((h:string, i:number)=>(
                <li key={i} className="p-3 bg-white/80 rounded shadow-sm flex gap-3">
                  <span className="text-blue-500 font-bold">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Video Player */}
        {s.videoUrls?.[0] && (
          <Card>
            <CardHeader><CardTitle>Session Video</CardTitle></CardHeader>
            <CardContent>
              <video controls className="w-full rounded bg-black" src={s.videoUrls[0]} />
            </CardContent>
          </Card>
        )}

        {/* Detailed Sections */}
        {s.feedback?.sections && (
          <Card>
            <CardHeader><CardTitle>Detailed Feedback</CardTitle></CardHeader>
            <CardContent>
              {Object.entries(s.feedback.sections).map(([key, val]: any)=>(
                <div key={key} className="mb-6 last:mb-0">
                  <h3 className="font-bold text-lg mb-3 capitalize flex items-center gap-2">
                    <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                    {key.replaceAll('_',' ')}
                  </h3>
                  <ul className="grid gap-2">
                    {val?.tips?.map((t:string, i:number)=>(
                      <li key={i} className="p-3 bg-gray-50 rounded border border-gray-100 text-gray-700">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Drills & Checklist */}
        <div className="grid md:grid-cols-2 gap-6">
           <Card>
            <CardHeader><CardTitle>Recommended Drills</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">In Water</h4>
                <ul className="space-y-2">
                  {s.feedback?.drills?.in_water?.map((t:string,i:number)=>(<li key={i} className="text-sm p-2 bg-blue-50 text-blue-800 rounded">{t}</li>))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Dry Land</h4>
                <ul className="space-y-2">
                  {s.feedback?.drills?.dry_land?.map((t:string,i:number)=>(<li key={i} className="text-sm p-2 bg-amber-50 text-amber-800 rounded">{t}</li>))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader><CardTitle>Next Session Checklist</CardTitle></CardHeader>
             <CardContent>
               <ul className="space-y-2">
                 {s.feedback?.next_session_checklist?.map((t:string,i:number)=>(
                   <li key={i} className="flex items-start gap-3 p-2">
                     <input type="checkbox" className="mt-1 w-4 h-4 text-blue-600 rounded" />
                     <span className="text-gray-700">{t}</span>
                   </li>
                 ))}
               </ul>
             </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}