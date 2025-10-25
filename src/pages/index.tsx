import Layout from "@/components/Layout";
import Link from "next/link";

export default function HomePage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative pt-16 pb-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full shadow border border-blue-100 mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-gray-700">AI-Powered Surf Coaching</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
            Upload your surf session.<br/>
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Get coach-level feedback</span> — instantly.
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Simple, practical tips tailored to your ride. Improve every session with personalized feedback.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/upload" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl shadow">Analyze My Session</Link>
            <a href="#how-it-works" className="border-2 border-gray-300 px-6 py-3 rounded-xl">How it works</a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Upload Your Session", desc: "Drag and drop videos or photos. Add stance, board, goals." },
            { title: "AI Analysis", desc: "We analyze your takeoff, turns, speed, and balance." },
            { title: "Get Feedback & Improve", desc: "Personalized tips, drills, and a next-session checklist." },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">{i+1}</div>
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 bg-gradient-to-b from-gray-50 to-white rounded-2xl">
        <h2 className="text-4xl font-bold mb-8 text-center">Simple, Transparent Pricing</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[
            { name: "Free", price: "$0", desc: "Try it out", features: ["1 session / month","Basic feedback","Community support","Session history"], popular: false },
            { name: "Pro", price: "$19", desc: "For serious surfers", features: ["Unlimited analyses","Detailed reports","Drill library","Progress tracking","Priority processing","PDF export"], popular: true },
          ].map((p)=>(
            <div key={p.name} className={`relative rounded-2xl border ${p.popular?'border-blue-500 shadow-2xl scale-[1.02]':'border-gray-200 shadow'} p-6`}>
              {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs px-3 py-1 rounded-full">MOST POPULAR</div>}
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl ${p.popular?'bg-gradient-to-br from-blue-500 to-cyan-500':'bg-gray-100'}`}></div>
                <div>
                  <h3 className="text-2xl font-bold">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.desc}</p>
                </div>
              </div>
              <div className="text-5xl font-extrabold">{p.price}<span className="text-base text-gray-500">/mo</span></div>
              <ul className="mt-4 space-y-2">{p.features.map(f=> <li key={f} className="flex gap-2">✅<span>{f}</span></li>)}</ul>
              <Link href="/upload" className={`block text-center mt-6 rounded-xl px-4 py-3 ${p.popular?'bg-gradient-to-r from-blue-600 to-cyan-600 text-white':'bg-gray-900 text-white'}`}>Get Started</Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16">
        <h2 className="text-4xl font-bold mb-8 text-center">FAQ</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            ["How does the AI analyze my surfing?","We use computer vision and expert prompts to assess stance, timing, line selection and turns."],
            ["What video quality do I need?","Any smartphone works. Film from the beach; up to 3 minutes supported."],
            ["Can I upload just photos?","Yes, you can upload photo sequences; we’ll analyze stance and body position."],
            ["Is my data private?","Yes. Files are private by default and deletable upon request."],
          ].map(([q,a],i)=>(
            <details key={i} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
              <summary className="font-semibold cursor-pointer">{q}</summary>
              <p className="text-gray-600 mt-2">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </Layout>
  );
}
