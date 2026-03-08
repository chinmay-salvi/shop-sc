import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../components/AuthContext";
import { 
  User, 
  Settings, 
  Star, 
  Package, 
  ShoppingBag, 
  Heart,
  CheckCircle2,
  Edit,
  Trash2,
  Eye,
  Shield,
  Lock,
  LogOut
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState("listings");
  const { hasSession, stableId, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const userStats = {
    totalListings: 8,
    activeSales: 5,
    completedSales: 12,
    rating: 4.8,
    joinedDate: "September 2024"
  };

  const myListings = [
    {
      id: 1,
      title: "Calculus Textbook - Like New",
      price: 45,
      image: "https://images.unsplash.com/photo-1633707392225-d883c8cd3e99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwdGV4dGJvb2slMjBzdGFja3xlbnwxfHx8fDE3NzE0ODkwOTh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      status: "active",
      views: 24,
      likes: 5
    },
    {
      id: 2,
      title: "Modern Study Desk",
      price: 80,
      image: "https://images.unsplash.com/photo-1718049719677-85afb466425a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkZXNrJTIwZnVybml0dXJlfGVufDF8fHx8MTc3MTQxNzE3Nnww&ixlib=rb-4.1.0&q=80&w=1080",
      status: "active",
      views: 42,
      likes: 8
    },
    {
      id: 3,
      title: "Student Backpack",
      price: 35,
      image: "https://images.unsplash.com/photo-1655303219938-3a771279c801?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNrcGFjayUyMHNjaG9vbCUyMGJhZ3xlbnwxfHx8fDE3NzE0NTM4OTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      status: "sold",
      views: 31,
      likes: 6
    }
  ];

  const savedItems = [
    {
      id: 4,
      title: "MacBook Pro 2022",
      price: 1200,
      image: "https://images.unsplash.com/photo-1608810832512-55200d57b14e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBtYWNib29rJTIwY29tcHV0ZXJ8ZW58MXx8fHwxNzcxNDg4MzI5fDA&ixlib=rb-4.1.0&q=80&w=1080",
      seller: "Anonymous Trojan"
    },
    {
      id: 5,
      title: "Road Bike - Trek FX 3",
      price: 450,
      image: "https://images.unsplash.com/photo-1763730727796-3b1ba3a61ade?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaWN5Y2xlJTIwYmlrZSUyMHN0dWRlbnR8ZW58MXx8fHwxNzcxNDg5MTAwfDA&ixlib=rb-4.1.0&q=80&w=1080",
      seller: "Anonymous Trojan"
    }
  ];

  // Redirect if not authenticated
  if (!hasSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view your profile</h2>
          <p className="text-gray-500 mb-6 text-sm">Verify your USC identity to access your listings and account.</p>
          <Link to="/auth">
            <Button className="bg-red-600 hover:bg-red-700 gap-2">
              <Shield className="w-4 h-4" />
              Sign In Anonymously
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-red-600 to-yellow-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="w-24 h-24 border-4 border-white">
              <AvatarFallback className="bg-white text-red-600 text-3xl">
                AT
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-4">
                <h1 className="text-3xl font-bold">Anonymous Trojan</h1>
                <Badge className="bg-green-500 text-white gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  ZK Verified
                </Badge>
              </div>
              
              {stableId && (
                <div className="mb-3 flex items-center gap-2 text-sm text-red-100">
                  <Shield className="w-4 h-4 opacity-70" />
                  <span className="opacity-70">Stable ID:</span>
                  <code className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded">{stableId}</code>
                </div>
              )}
              
              <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span>{userStats.rating} Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  <span>{userStats.completedSales} Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span>Member since {userStats.joinedDate}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Link to="/auth">
                <Button variant="secondary" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Identity
                </Button>
              </Link>
              <Button variant="outline" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Package className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">{userStats.totalListings}</div>
              <div className="text-sm text-gray-600">Total Listings</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <ShoppingBag className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">{userStats.activeSales}</div>
              <div className="text-sm text-gray-600">Active Listings</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">{userStats.completedSales}</div>
              <div className="text-sm text-gray-600">Completed Sales</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="listings" className="gap-2">
              <Package className="w-4 h-4" />
              My Listings
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Heart className="w-4 h-4" />
              Saved Items
            </TabsTrigger>
          </TabsList>

          {/* My Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">My Listings</h2>
              <Link to="/create-listing">
                <Button>Create New Listing</Button>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myListings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="relative h-48 bg-gray-100">
                    <ImageWithFallback
                      src={listing.image}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge 
                      className={`absolute top-3 right-3 ${
                        listing.status === 'active' 
                          ? 'bg-green-500' 
                          : 'bg-gray-500'
                      }`}
                    >
                      {listing.status === 'active' ? 'Active' : 'Sold'}
                    </Badge>
                  </div>
                  
                  <CardContent className="pt-4">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                      {listing.title}
                    </h3>
                    <p className="text-2xl font-bold text-red-600 mb-3">
                      ${listing.price}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {listing.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {listing.likes}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-2">
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Saved Items Tab */}
          <TabsContent value="saved" className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Saved Items</h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedItems.map((item) => (
                <Link key={item.id} to={`/product/${item.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="relative h-48 bg-gray-100">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 bg-white/90 hover:bg-white"
                      >
                        <Heart className="w-5 h-5 fill-red-600 text-red-600" />
                      </Button>
                    </div>
                    
                    <CardContent className="pt-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-2xl font-bold text-red-600 mb-1">
                        ${item.price}
                      </p>
                      <p className="text-sm text-gray-600">by {item.seller}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="h-16" />
    </div>
  );
}
