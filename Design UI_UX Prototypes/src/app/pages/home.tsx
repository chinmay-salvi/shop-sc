import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  Shield, 
  Eye, 
  Zap, 
  BookOpen, 
  Armchair, 
  Ticket, 
  Laptop,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function HomePage() {
  const features = [
    {
      icon: Shield,
      title: "Verified Trojans Only",
      description: "Anonymous verification ensures only USC students and faculty can access the marketplace"
    },
    {
      icon: Eye,
      title: "Privacy First",
      description: "Trade safely without exposing your personal information to strangers"
    },
    {
      icon: Zap,
      title: "AI-Powered Safety",
      description: "Computer vision automatically flags fraudulent listings and stock photos"
    }
  ];

  const categories = [
    { icon: BookOpen, name: "Textbooks", count: 234, color: "bg-blue-500" },
    { icon: Armchair, name: "Furniture", count: 156, color: "bg-green-500" },
    { icon: Ticket, name: "Tickets", count: 89, color: "bg-purple-500" },
    { icon: Laptop, name: "Electronics", count: 178, color: "bg-orange-500" }
  ];

  const recentListings = [
    {
      id: 1,
      title: "Calculus Textbook - Like New",
      price: 45,
      image: "https://images.unsplash.com/photo-1633707392225-d883c8cd3e99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwdGV4dGJvb2slMjBzdGFja3xlbnwxfHx8fDE3NzE0ODkwOTh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Textbooks"
    },
    {
      id: 2,
      title: "Modern Study Desk",
      price: 80,
      image: "https://images.unsplash.com/photo-1718049719677-85afb466425a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkZXNrJTIwZnVybml0dXJlfGVufDF8fHx8MTc3MTQxNzE3Nnww&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Furniture"
    },
    {
      id: 3,
      title: "MacBook Pro 2022",
      price: 1200,
      image: "https://images.unsplash.com/photo-1608810832512-55200d57b14e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBtYWNib29rJTIwY29tcHV0ZXJ8ZW58MXx8fHwxNzcxNDg4MzI5fDA&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Electronics"
    },
    {
      id: 4,
      title: "Student Backpack",
      price: 35,
      image: "https://images.unsplash.com/photo-1655303219938-3a771279c801?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNrcGFjayUyMHNjaG9vbCUyMGJhZ3xlbnwxfHx8fDE3NzE0NTM4OTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Accessories"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-yellow-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1674255499627-640d84485ecc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxVU0MlMjBjYW1wdXMlMjB1bml2ZXJzaXR5JTIwYnVpbGRpbmd8ZW58MXx8fHwxNzcxNDg5MDk4fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="USC Campus"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-yellow-400 text-red-900 hover:bg-yellow-300">
              USC Exclusive Marketplace
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              The Trojan Marketplace Built on Trust
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-red-50">
              Buy and sell safely within the USC community. Anonymous verification, zero compromises on privacy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/marketplace">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  Browse Marketplace
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              
              <Link to="/create-listing">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/30">
                  List an Item
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                <span>1,247+ Active Listings</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                <span>100% Verified Trojans</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why ShopSC?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A marketplace designed specifically for the USC community with privacy and safety at its core
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:border-red-600 transition-colors">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Browse by Category
            </h2>
            <p className="text-xl text-gray-600">
              Find exactly what you need
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Link key={index} to="/marketplace">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6 text-center">
                      <div className={`w-16 h-16 ${category.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {category.name}
                      </h3>
                      <p className="text-gray-500">
                        {category.count} items
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Listings Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Recent Listings
              </h2>
              <p className="text-xl text-gray-600">
                Fresh items from your fellow Trojans
              </p>
            </div>
            <Link to="/marketplace">
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentListings.map((listing) => (
              <Link key={listing.id} to={`/product/${listing.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                  <div className="relative h-48 bg-gray-100">
                    <ImageWithFallback
                      src={listing.image}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    {listing.verified && (
                      <Badge className="absolute top-2 right-2 bg-green-500 text-white gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <Badge variant="outline" className="mb-2">
                      {listing.category}
                    </Badge>
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                      {listing.title}
                    </h3>
                    <p className="text-2xl font-bold text-red-600">
                      ${listing.price}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-red-600 to-yellow-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Join the Trojan Marketplace?
          </h2>
          <p className="text-xl mb-8 text-red-50">
            List your items or find great deals from verified USC students
          </p>
          <Link to="/create-listing">
            <Button size="lg" variant="secondary" className="gap-2">
              Create Your First Listing
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
