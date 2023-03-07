import type { ClientEngineState } from "./client-engine";

// based on https://commons.wikimedia.org/wiki/File:557-birthday-cake-1.svg
// author: Creative Commons Attribution 4.0 International
// licensed under Creative Commons Attribution 4.0 International
import cakeSvgDataUrl from "./cake.svg";
import candleLitSvgDataUrl from "./candle-lit.svg";
import candleBlownOutSvgDataUrl from "./candle-blown-out.svg";

export interface RendererOptions {
  containerElement: HTMLElement;
}

export class Renderer {
  private readonly containerElement: HTMLElement;

  private readonly cakeSvg: HTMLImageElement;
  private readonly candleSvgTemplate: HTMLImageElement;
  private readonly candleSvgs: HTMLImageElement[] = [];

  constructor({ containerElement: container }: RendererOptions) {
    this.containerElement = container;

    Object.assign(this.containerElement.style, {
      position: "fixed",
      width: "100vmin",
      height: "100vmin",
      top: "0",
      left: "0",
      bottom: "0",
      right: "0",
      margin: "auto",
    });

    this.cakeSvg = document.createElement("img");

    Object.assign(this.cakeSvg, {
      src: cakeSvgDataUrl,
    });

    Object.assign(this.cakeSvg.style, {
      width: "100%",
      height: "100%",
    });

    this.candleSvgTemplate = document.createElement("img");

    Object.assign(this.candleSvgTemplate, {
      src: candleLitSvgDataUrl,
    });

    Object.assign(this.candleSvgTemplate.style, {
      position: "absolute",
      width: "auto",
      height: "16%",
    });

    this.containerElement.replaceChildren(this.cakeSvg);
  }

  updateEngineState(state: ClientEngineState): void {
    if (this.candleSvgs.length !== state.candles.length) {
      this.containerElement.replaceChildren(this.cakeSvg);
      this.candleSvgs.splice(0, this.candleSvgs.length);

      for (const candle of state.candles) {
        const candleSvg = this.candleSvgTemplate.cloneNode() as HTMLImageElement;

        candleSvg.dataset.isLit = candle.isLit ? "true" : "";
        candleSvg.src = candle.isLit ? candleLitSvgDataUrl : candleBlownOutSvgDataUrl;

        Object.assign(candleSvg.style, {
          left: `${44 + 48 * candle.x}%`,
          top: `${30 + 14 * candle.z}%`,
          zIndex: Math.round(1000 * (1 + candle.z)),
        });

        this.containerElement.appendChild(candleSvg);
        this.candleSvgs.push(candleSvg);
      }
    } else {
      for (let i = 0; i < this.candleSvgs.length; i++) {
        if (this.candleSvgs[i].dataset.isLit && !state.candles[i].isLit) {
          this.candleSvgs[i].src = candleBlownOutSvgDataUrl;
          this.candleSvgs[i].dataset.isLit = "";
        }

        if (!this.candleSvgs[i].dataset.isLit && state.candles[i].isLit) {
          this.candleSvgs[i].src = candleLitSvgDataUrl;
          this.candleSvgs[i].dataset.isLit = "true";
        }
      }
    }
  }
}
