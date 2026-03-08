import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/home";
import { MarketplacePage } from "./pages/marketplace";
import { ProductDetailPage } from "./pages/product-detail";
import { CreateListingPage } from "./pages/create-listing";
import { ProfilePage } from "./pages/profile";
import { Layout } from "./components/layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "marketplace", Component: MarketplacePage },
      { path: "product/:id", Component: ProductDetailPage },
      { path: "create-listing", Component: CreateListingPage },
      { path: "profile", Component: ProfilePage },
    ],
  },
]);
