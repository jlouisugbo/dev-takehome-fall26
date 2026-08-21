import { NP } from "@/lib/constants/strings";
import Providers from "@/app/providers"
import '@/app/globals.css';

export const metadata = {
  title: NP.NAME,
  description: NP.TAGLINE,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
