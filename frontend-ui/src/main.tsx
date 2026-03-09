
  // import { createRoot } from "react-dom/client";
  // import App from "./app/App.tsx";
  // import "./styles/index.css";

  // createRoot(document.getElementById("root")!).render(<App />);
  

import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./app/App.tsx";
import "./styles/index.css";

const GOOGLE_CLIENT_ID = (import.meta as unknown as { env: Record<string, string> }).env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);