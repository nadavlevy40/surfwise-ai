import useSWR from "swr";
import Layout from "@/components/Layout";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function LibraryPage(){
  const { data, error } = useSWR("/api/sessions", fetcher);

  if (error) return <Layout><p>Error loading sessions.</p></Layout>;
  if (!data) return <Layout><p>Loading...</p></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Sessions</h1>
            <p className="text-gray-600">Track your progress and review past feedback</p>
          </div>
          <Link href="/upload" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded">New Session</Link>
        </div>

        {data.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow">
            <p className="text-gray-700 mb-4">No sessions yet</p>
            <Link href="/upload" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded">Upload Your First Session</Link>
          </div>
        ): (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((s:any)=>(
              <Link key={s.id} href={`/results/${s.id}`} className="rounded-xl border border-gray-200 bg-white shadow hover:shadow-lg overflow-hidden">
                {s.thumbnail && <img src={s.thumbnail} alt={s.title} className="w-full aspect-video object-cover" />}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{s.title}</h3>
                    {s.analysisStatus === 'completed' ? <span className="text-green-600">●</span> : <span className="text-yellow-600 animate-pulse">●</span>}
                  </div>
                  <div className="text-sm text-gray-600">{new Date(s.createdAt).toLocaleDateString()}</div>
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{s.stance}</span>
                    <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">{s.skillLevel}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
