import Layout from "@/components/Layout";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleGetStarted = () => {
    if (user) {
      router.push("/upload");
    } else {
      router.push("/login");
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative pt-16 pb-12">
        <div className="text-center max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full shadow border border-blue-100 mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-gray-700">AI-Powered Surf Coaching</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight text-gray-900">
            Upload your surf session.<br/>
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Get coach-level feedback</span> — instantly.
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Simple, practical tips tailored to your ride. Improve every session with personalized feedback.
          </p>
          <div className="flex gap-3 justify-center">
            {/* UPDATED MAIN BUTTON */}
            <Button 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Analyze My Session
            </Button>
            
            <a href="#how-it-works" className="flex items-center justify-center border-2 border-gray-300 px-6 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Upload Your Session", desc: "Drag and drop videos. We auto-trim and extract biomechanics data." },
              { title: "AI Analysis", desc: "Gemini Pro analyzes your stance, compression, and line selection." },
              { title: "Get Feedback & Improve", desc: "Visual skeleton overlays, specific drills, and a clear checklist." },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4 text-blue-700 font-bold text-xl">{i+1}</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 bg-gradient-to-b from-gray-50 to-white rounded-2xl">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-8 text-center text-gray-900">Simple, Transparent Pricing</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Free", price: "$0", desc: "Try it out", features: ["1 session / month","Basic feedback","Community support","Session history"], popular: false },
              { name: "Pro", price: "$19", desc: "For serious surfers", features: ["Unlimited analyses","Detailed biomechanics","Drill library","Progress tracking","Priority processing","Frame-by-Frame Inspector"], popular: true },
            ].map((p)=>(
              <div key={p.name} className={`relative rounded-2xl border ${p.popular?'border-blue-500 shadow-2xl scale-[1.02] bg-white':'border-gray-200 shadow bg-white'} p-8`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs px-3 py-1 rounded-full font-bold">MOST POPULAR</div>}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${p.popular?'bg-blue-100 text-blue-600':'bg-gray-100 text-gray-600'}`}>
                    {p.popular ? '🚀' : '👋'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{p.name}</h3>
                    <p className="text-sm text-gray-500">{p.desc}</p>
                  </div>
                </div>
                <div className="text-5xl font-extrabold text-gray-900 my-4">{p.price}<span className="text-base text-gray-500 font-normal">/mo</span></div>
                <ul className="mt-6 space-y-3 mb-8">
                  {p.features.map(f=> <li key={f} className="flex gap-2 text-gray-700"><span className="text-green-500">✅</span><span>{f}</span></li>)}
                </ul>
                
                <Button 
                  onClick={handleGetStarted}
                  className={`w-full h-12 text-lg font-bold rounded-xl ${p.popular?'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg':'bg-gray-900 text-white hover:bg-gray-800'}`}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-8 text-center text-gray-900">FAQ</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              ["How does the AI analyze my surfing?","We use computer vision (MediaPipe) to extract your skeletal data and Gemini Pro to analyze your biomechanics against pro standards."],
              ["What video quality do I need?","Any smartphone works. Film from the beach or a follow-cam. We auto-crop and zoom to find you."],
              ["Can I upload just photos?","Currently we support video for full biomechanics analysis, but photo support is coming soon."],
              ["Is my data private?","Yes. Your sessions are private to your account and stored securely."],
            ].map(([q,a],i)=>(
              <details key={i} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm group">
                <summary className="font-semibold cursor-pointer flex justify-between items-center text-gray-900 list-none">
                  {q}
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <p className="text-gray-600 mt-2 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}