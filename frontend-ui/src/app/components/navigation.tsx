import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ShoppingBag, PlusCircle, User, Search, Lock, LogOut, Shield, ChevronDown, Settings, Heart } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "./AuthContext";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasSession, stableId, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/");
  };

  const close = () => setDropdownOpen(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-yellow-500 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-xl text-gray-900">ShopSC</div>
              <div className="text-xs text-gray-500">Trojan Marketplace</div>
            </div>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type="text" placeholder="Search textbooks, furniture, tickets..." className="pl-9 w-full" />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            <Link to="/marketplace">
              <Button variant={isActive("/marketplace") ? "default" : "ghost"} size="sm" className="hidden sm:inline-flex">
                Browse
              </Button>
            </Link>

            {hasSession ? (
              <>
                <Link to="/create-listing">
                  <Button variant={isActive("/create-listing") ? "default" : "ghost"} size="sm" className="gap-1.5">
                    <PlusCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Sell</span>
                  </Button>
                </Link>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="relative flex items-center gap-1 px-2.5 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      T
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                    {/* Green dot */}
                    <span className="absolute top-1.5 right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
                  </button>

                  {dropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div className="fixed inset-0 z-40" onClick={close} />

                      {/* Panel */}
                      <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">

                        {/* Identity header */}
                        <div className="px-4 py-3 bg-gradient-to-br from-red-50 to-yellow-50 border-b border-gray-100">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              T
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Anonymous Trojan</p>
                              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                <Shield className="w-3 h-3" /> ZK Verified
                              </span>
                            </div>
                          </div>
                          {stableId && (
                            <p className="text-xs text-gray-400 font-mono truncate mt-1">
                              ID: {stableId}
                            </p>
                          )}
                        </div>

                        {/* Menu */}
                        <div className="py-1.5">
                          <Link
                            to="/profile"
                            onClick={close}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <User className="w-4 h-4 text-gray-400" />
                            My Profile
                          </Link>
                          <Link
                            to="/create-listing"
                            onClick={close}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <PlusCircle className="w-4 h-4 text-gray-400" />
                            Create Listing
                          </Link>
                          <Link
                            to="/marketplace"
                            onClick={close}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Heart className="w-4 h-4 text-gray-400" />
                            Saved Items
                          </Link>
                          <Link
                            to="/auth"
                            onClick={close}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Settings className="w-4 h-4 text-gray-400" />
                            Identity & Security
                          </Link>
                        </div>

                        {/* Sign out */}
                        <div className="border-t border-gray-100 py-1.5">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="gap-2 bg-red-600 hover:bg-red-700">
                  <Lock className="w-4 h-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input type="text" placeholder="Search..." className="pl-9 w-full" />
          </div>
        </div>
      </div>
    </nav>
  );
}
