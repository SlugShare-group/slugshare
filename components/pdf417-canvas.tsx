"use client";

import { useEffect, useRef } from "react";
import bwipjs from "bwip-js";

type Pdf417CanvasProps = {
  value: string;
  scale?: number;
  height?: number;
  aspectRatio?: number;
  maxWidthClassName?: string;
};

export function Pdf417Canvas({
  value,
  scale = 4,
  height = 20,
  aspectRatio = 4 / 1,
  maxWidthClassName = "max-w-full",
}: Pdf417CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    try {
      bwipjs.toCanvas(canvas, {
        bcid: "pdf417",
        text: value,
        scale,
        height,
        includetext: false,
        backgroundcolor: "FFFFFF",
        paddingwidth: 10,
        paddingheight: 10,
      });
    } catch (error) {
      console.error("Unable to render PDF417 barcode:", error);
    }
  }, [value, scale, height]);

  return (
    <div
      className={`mx-auto w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-white p-4 shadow-sm ${maxWidthClassName}`}
      style={{ aspectRatio }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
