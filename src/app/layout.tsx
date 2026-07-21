import "./globals.css";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

const sans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-sans-src" });
const serif = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], weight: ["400", "600"], variable: "--font-serif-src" });

export const metadata = { title: "Détective DD", description: "Notation Développement Durable — aide à la notation" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="fr" className={`${sans.variable} ${serif.variable}`}><body>{children}</body></html>);
}
