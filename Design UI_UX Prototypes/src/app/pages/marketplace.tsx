import { useState } from "react";
import { Link } from "react-router";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { CheckCircle2, Filter, SlidersHorizontal } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function MarketplacePage() {
  const [priceRange, setPriceRange] = useState([0, 1500]);
  const [showFilters, setShowFilters] = useState(false);

  const listings = [
    {
      id: 1,
      title: "Calculus Textbook - Like New",
      price: 45,
      image: "https://images.unsplash.com/photo-1633707392225-d883c8cd3e99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwdGV4dGJvb2slMjBzdGFja3xlbnwxfHx8fDE3NzE0ODkwOTh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Textbooks",
      condition: "Like New",
      posted: "2 hours ago"
    },
    {
      id: 2,
      title: "Modern Study Desk",
      price: 80,
      image: "https://images.unsplash.com/photo-1718049719677-85afb466425a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkZXNrJTIwZnVybml0dXJlfGVufDF8fHx8MTc3MTQxNzE3Nnww&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Furniture",
      condition: "Good",
      posted: "5 hours ago"
    },
    {
      id: 3,
      title: "MacBook Pro 2022 - M1 Chip",
      price: 1200,
      image: "https://images.unsplash.com/photo-1608810832512-55200d57b14e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBtYWNib29rJTIwY29tcHV0ZXJ8ZW58MXx8fHwxNzcxNDg4MzI5fDA&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Electronics",
      condition: "Like New",
      posted: "1 day ago"
    },
    {
      id: 4,
      title: "Student Backpack - North Face",
      price: 35,
      image: "https://images.unsplash.com/photo-1655303219938-3a771279c801?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNrcGFjayUyMHNjaG9vbCUyMGJhZ3xlbnwxfHx8fDE3NzE0NTM4OTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Accessories",
      condition: "Good",
      posted: "1 day ago"
    },
    {
      id: 5,
      title: "Road Bike - Trek FX 3",
      price: 450,
      image: "https://images.unsplash.com/photo-1763730727796-3b1ba3a61ade?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaWN5Y2xlJTIwYmlrZSUyMHN0dWRlbnR8ZW58MXx8fHwxNzcxNDg5MTAwfDA&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Transportation",
      condition: "Excellent",
      posted: "2 days ago"
    },
    {
      id: 6,
      title: "Comfortable Desk Chair",
      price: 65,
      image: "https://images.unsplash.com/photo-1694151569569-8288e3118519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb3JtJTIwZnVybml0dXJlJTIwY2hhaXJ8ZW58MXx8fHwxNzcxNDQ0NDk5fDA&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Furniture",
      condition: "Good",
      posted: "2 days ago"
    },
    {
      id: 7,
      title: "Concert Tickets - 2 Available",
      price: 120,
      image: "https://images.unsplash.com/photo-1758263995648-222571672475?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwdGlja2V0cyUyMGV2ZW50fGVufDF8fHx8MTc3MTM4MzgxMHww&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Tickets",
      condition: "New",
      posted: "3 days ago"
    },
    {
      id: 8,
      title: "Engineering Textbook Bundle",
      price: 95,
      image: "https://images.unsplash.com/photo-1633707392225-d883c8cd3e99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwdGV4dGJvb2slMjBzdGFja3xlbnwxfHx8fDE3NzE0ODkwOTh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      verified: true,
      category: "Textbooks",
      condition: "Good",
      posted: "4 days ago"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Marketplace
          </h1>
          <p className="text-lg text-gray-600">
            {listings.length} items available from verified Trojans
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <Card className="sticky top-20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </h2>
                  <Button variant="ghost" size="sm">Reset</Button>
                </div>

                {/* Category Filter */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Category
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="textbooks">Textbooks</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="tickets">Tickets</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition Filter */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Condition
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Condition</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="like-new">Like New</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Price Range
                  </label>
                  <div className="mb-4">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={1500}
                      step={10}
                      className="mb-2"
                    />
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Verified Only */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Verified Only
                    </span>
                  </label>
                </div>

                {/* Location */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Location
                  </label>
                  <Input placeholder="e.g., North Campus" />
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <Button
                variant="outline"
                className="lg:hidden gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </Button>

              <div className="flex items-center gap-4 ml-auto">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Sort by:
                </span>
                <Select defaultValue="recent">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Listings Grid */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Link key={listing.id} to={`/product/${listing.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden h-full">
                    <div className="relative h-56 bg-gray-100">
                      <ImageWithFallback
                        src={listing.image}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                      {listing.verified && (
                        <Badge className="absolute top-3 right-3 bg-green-500 text-white gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      )}
                      <Badge className="absolute top-3 left-3 bg-white/90 text-gray-900">
                        {listing.category}
                      </Badge>
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
                        {listing.title}
                      </h3>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-2xl font-bold text-red-600">
                          ${listing.price}
                        </p>
                        <Badge variant="outline">
                          {listing.condition}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        Posted {listing.posted}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Load More */}
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg">
                Load More Listings
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
