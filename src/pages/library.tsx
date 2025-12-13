import useSWR, { mutate } from "swr";
import Layout from "@/components/Layout";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Trash2, Calendar, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function LibraryPage(){
  const { user, loading: authLoading } = useAuth();

  // 1. Pass userId to API to fix the "Seeing everyone's data" bug
  const { data: sessions, isLoading } = useSWR(
    user ? `/api/sessions?userId=${user.uid}` : null, 
    fetcher
  );

  // 2. Handle Delete
  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault(); // Stop clicking the card link
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      await fetch(`/api/sessions?id=${sessionId}`, { method: "DELETE" });
      // Refresh list instantly
      mutate(`/api/sessions?userId=${user?.uid}`); 
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  if (authLoading || isLoading) return (
    <Layout>
      <div className="flex h-96 items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </Layout>
  );

  if (!user) return (
    <Layout>
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Please log in to view your sessions</h2>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">My Sessions</h1>
            <p className="text-gray-500">Track your progress and review feedback</p>
          </div>
          <Link href="/upload">
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-lg hover:shadow-xl transition-all">
              + New Analysis
            </Button>
          </Link>
        </div>

        {!sessions || sessions.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-3xl">🏄‍♂️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No sessions yet</h3>
              <p className="text-gray-500 mb-6 max-w-sm">Upload your first surfing video to get AI-powered coaching tips.</p>
              <Link href="/upload">
                <Button variant="outline">Upload First Session</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((s: any) => (
              <Link key={s.id} href={`/results/${s.id}`} className="group block h-full">
                <Card className="h-full border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Thumbnail / Status Header */}
                  <div className="h-40 bg-gray-100 relative flex items-center justify-center overflow-hidden">
                    {s.thumbnail ? (
                      <img src={s.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="text-4xl opacity-20">🌊</div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {s.analysisStatus === 'completed' ? (
                        <Badge className="bg-green-500 hover:bg-green-600 shadow-sm">Completed</Badge>
                      ) : s.analysisStatus === 'error' ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : (
                        <Badge className="bg-yellow-500 animate-pulse text-yellow-900">Processing...</Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-5 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {s.title || "Untitled Session"}
                      </h3>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="capitalize">{s.skillLevel || "Unknown"}</span> • <span className="capitalize">{s.stance || "Unknown"}</span>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0 duration-300">
                        View Analysis <ArrowRight className="w-3 h-3" />
                      </div>
                      
                      {/* DELETE BUTTON */}
                      <button
                        onClick={(e) => handleDelete(e, s.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}