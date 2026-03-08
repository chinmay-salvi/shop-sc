import { Outlet } from "react-router";
import { Navigation } from "./navigation";
import { AuthProvider } from "./AuthContext";

export function Layout() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  );
}
