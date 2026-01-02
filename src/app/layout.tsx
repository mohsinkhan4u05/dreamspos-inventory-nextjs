import "../../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "@uploadthing/react/styles.css";
import "../customStyle.scss";
import "../style/css/feather.css";
import "../style/css/line-awesome.min.css";
import "../style/icons/tabler-icons/webfont/tabler-icons.css";
import "../style/icons/fontawesome/css/fontawesome.min.css";
import "../style/icons/fontawesome/css/all.min.css";
import "../style/fonts/feather/css/iconfont.css";
import BootstrapJs from "../components/bootstrap-js/bootstrapjs";
import { Providers } from "../components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bawarchi Masala - Inventory Management Software",
  description:
    "Bawarchi Masala Inventory Management Software is a powerful Inventory Management System designed for managing inventory, sales, and purchases.",
  keywords:
    "Bawarchi Masala Inventory Management Software is a powerful Inventory Management System designed for managing inventory, sales, and purchases.",
  authors: [{ name: "Bawarchi Masala" }],
  icons: {
    icon: "favicon.png",
    shortcut: "favicon.png", // Add shortcut icon for better support
    apple: "favicon.png", // Optional: for Apple devices (place in `public/`)
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <>{children}</>
          <BootstrapJs />
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
