declare module "bwip-js" {
  const bwipjs: {
    toCanvas(canvas: HTMLCanvasElement, options: Record<string, unknown>): void;
  };

  export default bwipjs;
}
