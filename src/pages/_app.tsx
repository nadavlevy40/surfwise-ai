import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <PayPalScriptProvider options={{ 
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
        intent: "subscription",
        vault: true 
      }}>
        <Component {...pageProps} />
      </PayPalScriptProvider>
    </AuthProvider>
  );
}