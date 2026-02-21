import GoogleProvider from "../components/GoogleProvider";

export const metadata = {
  title: "shop-sc",
  description: "Privacy-preserving USC marketplace"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GoogleProvider>{children}</GoogleProvider>
      </body>
    </html>
  );
}
