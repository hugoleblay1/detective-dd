import "./globals.css";
export const metadata = { title: "Détective DD", description: "Notation Développement Durable — aide à la notation" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="fr"><body>{children}</body></html>);
}
