import GoogleProvider from "../components/GoogleProvider";
import Navbar from "../components/Navbar";
import "./globals.css";
import AIChatbot from "../components/AIChatbot";


export const metadata = {
  title: "ShopSC — Trojan Marketplace",
  description: "Privacy-preserving USC-only marketplace. Buy and sell safely with zero-knowledge proof verification.",
  icons: { icon: "/icon.svg" }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GoogleProvider>
          <Navbar />
          <div className="page-content">
            {children}
          </div>
	<AIChatbot />
        </GoogleProvider>
      </body>
    </html>
  );
}
