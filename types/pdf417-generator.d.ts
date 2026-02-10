declare module "pdf417-generator" {
  export function draw(
    payload: string,
    canvas: HTMLCanvasElement,
    aspectRatio?: number
  ): void;
}
