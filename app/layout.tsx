import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import Header from "@/components/Header";
import { COURSE } from "@/lib/course";
import { publishedDays } from "@/lib/content";

export const metadata: Metadata = {
  title: { default: COURSE.title, template: `%s · ${COURSE.short}` },
  description: COURSE.tagline,
};

const themeScript = `try{var t=localStorage.getItem('mci-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <Header published={publishedDays()} />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t py-8 text-center text-sm faint" style={{ borderColor: "var(--border)" }}>
          <div className="font-semibold muted">{COURSE.title}</div>
          <div className="mt-1">
            {COURSE.audience} · {COURSE.author}
          </div>
        </footer>
      </body>
    </html>
  );
}
