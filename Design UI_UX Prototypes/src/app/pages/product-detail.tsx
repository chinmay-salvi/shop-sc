import { Link, useParams } from "react-router";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  MessageCircle, 
  Share2,
  Heart,
  ShieldCheck,
  ArrowLeft,
  Package,
  Star
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function ProductDetailPage() {
  const { id } = useParams();

  // Mock product data - in real app would fetch based on id
  const product = {
    id: id,
    title: "MacBook Pro 2022 - M1 Chip",
    price: 1200,
    description: "Selling my MacBook Pro 2022 with M1 chip. Excellent condition, barely used. Purchased in Fall 2023 for coursework but upgrading to a newer model. Comes with original charger and box. Battery health is at 97%. No scratches or dents. Perfect for CS students or anyone needing a reliable laptop.",
    images: [
      "https://images.unsplash.com/photo-1608810832512-55200d57b14e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBtYWNib29rJTIwY29tcHV0ZXJ8ZW58MXx8fHwxNzcxNDg4MzI5fDA&ixlib=rb-4.1.0&q=80&w=1080"
    ],
    category: "Electronics",
    condition: "Like New",
    location: "University Village",
    posted: "1 day ago",
    verified: true,
    seller: {
      name: "Anonymous Trojan",
      rating: 4.8,
      totalSales: 12,
      joinedDate: "September 2024",
      verified: true
    },
    specs: [
      { label: "Brand", value: "Apple" },
      { label: "Model", value: "MacBook Pro 2022" },
      { label: "Processor", value: "Apple M1" },
      { label: "RAM", value: "16GB" },
      { label: "Storage", value: "512GB SSD" },
      { label: "Screen Size", value: "13.3 inches" }
    ]
  };

  const relatedItems = [
    {
      id: 2,
      title: "iPad Pro with Apple Pencil",
      price: 650,
      image: "https://images.unsplash.com/photo-1608810832512-55200d57b14e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBtYWNib29rJTIwY29tcHV0ZXJ8ZW58MXx8fHwxNzcxNDg4MzI5fDA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 3,
      title: "Wireless Keyboard & Mouse",
      price: 45,
      image: "https://images.unsplash.com/photo-1608810832512-55200d57b14e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBtYWNib29rJTIwY29tcHV0ZXJ8ZW58MXx8fHwxNzcxNDg4MzI5fDA&ixlib=rb-4.1.0&q=80&w=1080"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/marketplace" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image */}
            <Card className="overflow-hidden">
              <div className="relative h-96 lg:h-[500px] bg-gray-100">
                <ImageWithFallback
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                {product.verified && (
                  <Badge className="absolute top-4 right-4 bg-green-500 text-white gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    AI Verified Photo
                  </Badge>
                )}
              </div>
            </Card>

            {/* Product Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Badge className="mb-2">{product.category}</Badge>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {product.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {product.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Posted {product.posted}
                      </span>
                      <Badge variant="outline">{product.condition}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon">
                      <Heart className="w-5 h-5" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
                  <p className="text-gray-700 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <Separator className="my-6" />

                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Specifications
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {product.specs.map((spec, index) => (
                      <div key={index} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">{spec.label}:</span>
                        <span className="text-gray-900">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Safety Notice */}
            <Card className="border-2 border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <ShieldCheck className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Safety Tips</h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Meet in a public place on campus</li>
                      <li>• Inspect the item before purchasing</li>
                      <li>• Use secure payment methods</li>
                      <li>• Trust your instincts - if something feels off, walk away</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Price and Seller Info */}
          <div className="space-y-6">
            {/* Price and Contact */}
            <Card className="sticky top-20">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-red-600 mb-6">
                  ${product.price}
                </div>

                <div className="space-y-3 mb-6">
                  <Button className="w-full gap-2" size="lg">
                    <MessageCircle className="w-5 h-5" />
                    Contact Seller
                  </Button>
                  <Button variant="outline" className="w-full" size="lg">
                    Make an Offer
                  </Button>
                </div>

                <Separator className="my-6" />

                {/* Seller Info */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Seller Information</h3>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-red-600 text-white">
                        AT
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {product.seller.name}
                        </span>
                        {product.seller.verified && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{product.seller.rating} rating</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sales:</span>
                      <span className="font-medium text-gray-900">{product.seller.totalSales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Member Since:</span>
                      <span className="font-medium text-gray-900">{product.seller.joinedDate}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-4">
                    View Seller Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Related Items */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-gray-900 mb-4">Similar Items</h3>
                <div className="space-y-4">
                  {relatedItems.map((item) => (
                    <Link key={item.id} to={`/product/${item.id}`}>
                      <div className="flex gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                          <ImageWithFallback
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                            {item.title}
                          </h4>
                          <p className="text-red-600 font-bold">
                            ${item.price}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
