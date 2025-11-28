import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Query-Mate AI</title>
        <link
          rel="icon"
          href="https://img.icons8.com/?size=100&id=unXm4ixWAr6H&format=png&color=000000"
          sizes="any"
        />
      </head>
      <body className="bg-purple-50 text-gray-900 min-h-screen flex flex-col">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
