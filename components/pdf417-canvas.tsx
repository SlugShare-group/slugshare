"use client";

import { useEffect, useRef } from "react";
import bwipjs from "bwip-js";

type Pdf417CanvasProps = {
  value: string;
  scaleX?: number;
  scaleY?: number;
  rowMult?: number;
  maxWidthClassName?: string;
};

export function Pdf417Canvas({
  value,
  scaleX = 4,
  scaleY = 4,
  rowMult = 4,
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
        scaleX,
        scaleY,
        rowmult: rowMult,
        includetext: false,
        backgroundcolor: "FFFFFF",
        paddingwidth: 10,
        paddingheight: 10,
      });
    } catch (error) {
      console.error("Unable to render PDF417 barcode:", error);
    }
  }, [value, scaleX, scaleY, rowMult]);

  return (
    <div className={`mx-auto w-full overflow-x-auto rounded-xl border-2 border-slate-300 bg-white p-4 shadow-sm ${maxWidthClassName}`}>
      <canvas ref={canvasRef} className="mx-auto block h-auto max-w-none" style={{ imageRendering: "pixelated" }} />
    </div>
  );
}
