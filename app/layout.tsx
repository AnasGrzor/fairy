import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Onest } from "next/font/google";
import { Icons } from "@/components/icons";
import { SmoothScroll } from "@/components/smooth-scroll";
import { PALETTES } from "@/lib/data";
import "./globals.css";

/* Formerly "Big Shoulders Display". The variable font has an optical-size axis, so big headlines get the display cut. */
const display = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-shoulders",
  adjustFontFallback: false,
});

const body = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-onest",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://fairymeadowscomfortlodges.com"),
  title: "Fairy Meadows Comfort Lodges",
  description:
    "Elevated stays at 10,000 ft on Fairy Meadows, facing the Rakhiot face of Nanga Parbat. Open April to October. Book on WhatsApp with Sami.",
  openGraph: {
    title: "Fairy Meadows Comfort Lodges",
    description: "Wake up to Nanga Parbat. Sleep at its feet. Elevated stays at 10,000 ft, open April to October.",
    type: "website",
    locale: "en_GB",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c1d26",
};

/* Runs before paint: applies the saved palette and the motion flag so the page never flashes the wrong colours or hero height. */
const boot = `(function(){try{var d=document.documentElement,p=localStorage.getItem('fm-palette');if(p&&p!=='blue'&&${JSON.stringify(
  PALETTES.map((x) => x.id),
)}.indexOf(p)>-1)d.setAttribute('data-palette',p);}catch(e){}if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion');})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>
        <Icons />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
