import { Link, useLocation } from "react-router";
import { ShoppingBag, PlusCircle, User, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function Navigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-yellow-500 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-xl text-gray-900">ShopSC</div>
              <div className="text-xs text-gray-500">Trojan Marketplace</div>
            </div>
          </Link>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for textbooks, furniture, tickets..."
                className="pl-10 w-full"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            <Link to="/marketplace">
              <Button 
                variant={isActive("/marketplace") ? "default" : "ghost"}
                className="hidden sm:inline-flex"
              >
                Browse
              </Button>
            </Link>
            
            <Link to="/create-listing">
              <Button 
                variant={isActive("/create-listing") ? "default" : "ghost"}
                className="gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Sell</span>
              </Button>
            </Link>

            <Link to="/profile">
              <Button 
                variant={isActive("/profile") ? "default" : "ghost"}
                size="icon"
              >
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              className="pl-10 w-full"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
