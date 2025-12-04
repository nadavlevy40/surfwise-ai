import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Menu, X } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAF9] to-white flex flex-col">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <span className="text-white font-bold text-xl">🌊</span>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">
                Surf Coach AI
              </span>
            </Link>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center gap-8">
              {!user ? (
                <>
                  <a href="/#how-it-works" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">How It Works</a>
                  <a href="/#pricing" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Pricing</a>
                  <a href="/#faq" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">FAQ</a>
                  <div className="h-6 w-px bg-gray-300 mx-2"></div>
                  <Link href="/login" className="text-gray-900 font-bold hover:text-blue-600 transition-colors">
                    Log In
                  </Link>
                  <Link href="/login">
                    <Button className="bg-black hover:bg-gray-800 text-white rounded-full px-6">
                      Get Started
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/library" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                    My Sessions
                  </Link>
                  <Link href="/upload" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                    New Analysis
                  </Link>
                  
                  <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
                        ) : (
                          <UserIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-700 hidden lg:block">
                        {user.displayName || user.email?.split('@')[0]}
                      </span>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => logout()}
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* MOBILE MENU TOGGLE */}
            <button 
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU DROPDOWN */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-4 shadow-lg absolute w-full left-0">
            {!user ? (
              <>
                <Link href="/login" className="block w-full text-center py-2 font-bold text-gray-700">Log In</Link>
                <Link href="/login">
                  <Button className="w-full bg-blue-600 text-white">Get Started</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/library" className="block py-2 text-gray-700 font-medium">My Sessions</Link>
                <Link href="/upload" className="block py-2 text-gray-700 font-medium">New Analysis</Link>
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-gray-500">Signed in as {user.email}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => logout()}
                  >
                    Sign Out
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-4 opacity-50">
            <span className="text-2xl">🌊</span>
            <span className="font-bold text-lg">Surf Coach AI</span>
          </div>
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Surf Coach AI — Built for the lineup.
          </div>
        </div>
      </footer>
    </div>
  );
}