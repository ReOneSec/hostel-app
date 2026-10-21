import type { ReactNode } from "react";

export const metadata = {
  title: "Mirror Mess OTA server",
  description:
    "Standalone update server for the Mirror Mess Android app (Capgo web-bundle OTA updates).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
