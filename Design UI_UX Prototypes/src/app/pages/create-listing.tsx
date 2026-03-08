import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ArrowLeft,
  ImageIcon
} from "lucide-react";

export function CreateListingPage() {
  const navigate = useNavigate();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiVerification, setAiVerification] = useState<{status: 'verified' | 'warning' | null, message: string}>({
    status: null,
    message: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Simulate AI analysis
      setIsAnalyzing(true);
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setAiVerification({
          status: 'verified',
          message: 'Photo verified as authentic by Trojan Shield AI'
        });
        
        // In real app, would upload to server
        const newImages = Array.from(files).map(file => URL.createObjectURL(file));
        setUploadedImages([...uploadedImages, ...newImages]);
      }, 2000);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    if (uploadedImages.length === 1) {
      setAiVerification({ status: null, message: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, would submit to backend
    navigate('/marketplace');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/marketplace" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 w-fit mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Create Listing</h1>
          <p className="text-gray-600 mt-2">List your item for fellow Trojans to purchase</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Photos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-600 transition-colors">
                <input
                  type="file"
                  id="image-upload"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium text-gray-900 mb-1">
                    Click to upload photos
                  </p>
                  <p className="text-sm text-gray-600">
                    PNG, JPG up to 10MB each (max 5 photos)
                  </p>
                </label>
              </div>

              {/* AI Verification Status */}
              {isAnalyzing && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                  <span className="text-sm font-medium text-blue-900">
                    Trojan Shield AI is analyzing your photos...
                  </span>
                </div>
              )}

              {aiVerification.status === 'verified' && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    {aiVerification.message}
                  </span>
                </div>
              )}

              {aiVerification.status === 'warning' && (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">
                    {aiVerification.message}
                  </span>
                </div>
              )}

              {/* Image Preview Grid */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {index === 0 && (
                        <Badge className="absolute bottom-2 left-2 bg-white/90 text-gray-900">
                          Cover
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Calculus Textbook - Like New"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide a detailed description of your item. Include condition, any defects, reason for selling, etc."
                  rows={6}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select required>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="textbooks">Textbooks</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="tickets">Tickets</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="condition">Condition *</Label>
                  <Select required>
                    <SelectTrigger id="condition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="like-new">Like New</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Location */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price (USD) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      className="pl-7"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Pickup Location *</Label>
                  <Select required>
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north-campus">North Campus</SelectItem>
                      <SelectItem value="south-campus">South Campus</SelectItem>
                      <SelectItem value="university-village">University Village</SelectItem>
                      <SelectItem value="downtown">Downtown USC</SelectItem>
                      <SelectItem value="arts">USC Arts</SelectItem>
                      <SelectItem value="health-sciences">Health Sciences Campus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Pricing Tips</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• Research similar items to price competitively</li>
                    <li>• Be prepared to negotiate</li>
                    <li>• Consider the item's condition when pricing</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/marketplace')}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Publish Listing
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
