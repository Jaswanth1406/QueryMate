import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playground | QueryMate",
  description: "Claude Artifacts-style code playground with live preview and E2B execution",
};

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
