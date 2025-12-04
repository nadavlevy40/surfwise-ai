import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider 
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseClient";
import { useRouter } from "next/router";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPro: boolean; // <--- NEW: Track subscription
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  togglePro: () => void; // <--- NEW: For testing
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Default to false (Free Tier) for testing
  const [isPro, setIsPro] = useState(false); 
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      // In a real app, you would fetch the user's subscription status from Firestore here
      // e.g. const doc = await db.collection('users').doc(user.uid).get();
      // setIsPro(doc.data()?.plan === 'pro');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/upload");
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const togglePro = () => setIsPro(!isPro);

  return (
    <AuthContext.Provider value={{ user, loading, isPro, loginWithGoogle, logout, togglePro }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);