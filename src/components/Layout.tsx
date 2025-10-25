import React from "react";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAF9] to-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">🌊</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Surf Coach AI</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 font-medium">How It Works</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 font-medium">Pricing</a>
              <a href="#faq" className="text-gray-600 hover:text-blue-600 font-medium">FAQ</a>
            </div>
            <Link href="/upload" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-md shadow hover:shadow-lg">
              Get Started
            </Link>
          </div>
        </div>
      </nav>
      <main className="container py-6">{children}</main>
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container text-center text-gray-400">
          © {new Date().getFullYear()} Surf Coach AI — Built with 🌊
        </div>
      </footer>
    </div>
  );
}
