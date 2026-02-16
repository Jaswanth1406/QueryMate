"use client";

import { createContext, useContext, ReactNode } from "react";

interface CanvasContextType {
  isCanvasOpen: boolean;
  showPreview: (
    code: string,
    language: string,
    messageContent?: string,
  ) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export function useCanvas() {
  return useContext(CanvasContext);
}

export function CanvasProvider({
  children,
  isCanvasOpen,
  showPreview,
}: {
  children: ReactNode;
  isCanvasOpen: boolean;
  showPreview: (
    code: string,
    language: string,
    messageContent?: string,
  ) => void;
}) {
  return (
    <CanvasContext.Provider value={{ isCanvasOpen, showPreview }}>
      {children}
    </CanvasContext.Provider>
  );
}
