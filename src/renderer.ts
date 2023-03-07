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
  private lastClientEngineState: ClientEngineState;

  private readonly cakeSvg: HTMLImageElement;
  private readonly candleSvgTemplate: HTMLImageElement;
  private readonly candleSvgs: HTMLImageElement[] = [];

  constructor({ containerElement: container }: RendererOptions) {
    this.containerElement = container;

    this.lastClientEngineState = {
      clientCount: 0,
      windForce: 0,
      totalWindForce: { x: 0, z: 0 },
      candles: [],
    };

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

  updateEngineState(newState: ClientEngineState): void {
    if (newState.candles.length !== this.lastClientEngineState.candles.length) {
      this.containerElement.replaceChildren(this.cakeSvg);
      this.candleSvgs.splice(0, this.candleSvgs.length);

      for (const candle of newState.candles) {
        const candleSvg = this.candleSvgTemplate.cloneNode() as HTMLImageElement;

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
        if (this.lastClientEngineState.candles[i].isLit && !newState.candles[i].isLit) {
          this.candleSvgs[i].src = candleBlownOutSvgDataUrl;
        }

        if (!this.lastClientEngineState.candles[i].isLit && newState.candles[i].isLit) {
          this.candleSvgs[i].src = candleLitSvgDataUrl;
        }
      }
    }

    this.lastClientEngineState = newState;
  }
}
