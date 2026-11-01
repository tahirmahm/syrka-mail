import "./globals.css";
import "./workflows.css";
export const metadata = {
  title: "Syrka Mail",
  description: "A considered space for your conversations.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("syrka-theme")||"light"}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
