import { useRouter } from "next/router";
import useSWR from "swr";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function ResultsPage(){
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { data, isLoading } = useSWR(id? `/api/sessions?id=${id}` : null, fetcher, { refreshInterval: 2000 });

  if (!id) return <Layout><p>Missing session id.</p></Layout>;
  if (isLoading || !data) return <Layout><p>Loading your session...</p></Layout>;
  if (data.error) return <Layout><p>Error: {data.error}</p></Layout>;

  const s = Array.isArray(data)? data[0]: data;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{s.title}</h1>
            <p className="text-gray-600">{new Date(s.createdAt).toLocaleDateString()} • {s.stance} stance • {s.skillLevel}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Share</Button>
            <Button>Download PDF</Button>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader><CardTitle>Coach Summary</CardTitle></CardHeader>
          <CardContent>
            {s.feedback?.summary_highlights?.length ? (
              <ul className="space-y-2">
                {s.feedback.summary_highlights.map((h:string, i:number)=>(
                  <li key={i} className="p-3 bg-white/80 rounded">{h}</li>
                ))}
              </ul>
            ): <p>Analysis in progress...</p>}
          </CardContent>
        </Card>

        {s.videoUrls?.[0] && (
          <Card>
            <CardHeader><CardTitle>Session Video</CardTitle></CardHeader>
            <CardContent>
              <video controls className="w-full rounded" src={s.videoUrls[0]} />
            </CardContent>
          </Card>
        )}

        {s.feedback?.sections && (
          <Card>
            <CardHeader><CardTitle>Detailed Feedback</CardTitle></CardHeader>
            <CardContent>
              {Object.entries(s.feedback.sections).map(([key, val]: any)=>(
                <div key={key} className="mb-4">
                  <h3 className="font-semibold mb-2 capitalize">{key.replaceAll('_',' ')}</h3>
                  <ul className="space-y-1">{val?.tips?.map((t:string, i:number)=>(<li key={i} className="p-2 bg-gray-50 rounded border">{t}</li>))}</ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {s.feedback?.drills && (
          <Card>
            <CardHeader><CardTitle>Practice & Drills</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Dry-Land</h4>
                <ul className="space-y-1">{s.feedback.drills.dry_land?.map((t:string,i:number)=>(<li key={i} className="p-2 bg-amber-50 rounded border">{t}</li>))}</ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">In-Water</h4>
                <ul className="space-y-1">{s.feedback.drills.in_water?.map((t:string,i:number)=>(<li key={i} className="p-2 bg-blue-50 rounded border">{t}</li>))}</ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Next Session</h4>
                <ul className="space-y-1">{s.feedback.next_session_checklist?.map((t:string,i:number)=>(<li key={i} className="p-2 bg-green-50 rounded border">{t}</li>))}</ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
