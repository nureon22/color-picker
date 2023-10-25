import colorConvert from "color-convert";
import "./style.css";
import { RGB } from "color-convert/conversions";

// # Predefined functions
// ----------

function updatePanelCanvas(context: CanvasRenderingContext2D, hue: number) {
  hue = clampNumber(0, hue, 360);

  const { width, height } = context.canvas;

  // If worker is available, generate canvas image data in separated worker.
  if (worker) {
    worker.postMessage({ hue, width, height });
  } else {
    const imageData = generateCanvasImageData(hue, width, height);
    context.putImageData(imageData, 0, 0);
  }
}

function generateCanvasImageData(hue: number, width: number, height: number) {
  const arr = new Uint8ClampedArray(width * height * 4);

  for (let x = 0; x < width; x++) {
    const saturation = x / width;

    for (let y = 0; y < height; y++) {
      const value = 1 - y / height;

      const index = (y * width + x) * 4;

      const rgb = colorConvert.hsv.rgb([hue, saturation * 100, value * 100]);

      arr[index] = rgb[0];
      arr[index + 1] = rgb[1];
      arr[index + 2] = rgb[2];
      arr[index + 3] = 255;
    }
  }

  return new ImageData(arr, width, height);
}

function clampNumber(min: number, prefer: number, max: number) {
  return Math.min(Math.max(min, prefer), max);
}

function onEveryAnimationFrame(callback: FrameRequestCallback) {
  let stop = false;

  const innerFn: FrameRequestCallback = (time) => {
    if (stop) return;
    callback(time), requestAnimationFrame(innerFn);
  };
  requestAnimationFrame(innerFn);

  return () => {
    stop = true;
  };
}

const $ = (selector: string) => document.querySelector(selector);
const $$ = (selector: string) => [...document.querySelectorAll(selector)];

// ----------

let worker: Worker | undefined;

if (window.Worker) {
  worker = new Worker(
    new URL("./workers/canvas-image-data.ts", import.meta.url)
  );

  worker.addEventListener("message", ({ data }) => {
    if (data instanceof ImageData) {
      canvasContext?.putImageData(data, 0, 0);
    }
  });
}

const elements = {
  panelCanvas: $(".panel-canvas") as HTMLCanvasElement,
  panelHandle: $(".panel-handle") as HTMLElement,
  panel: $(".panel") as HTMLElement,
  preview: $(".preview") as HTMLElement,
  hueInput: $("input.hue-input") as HTMLInputElement,
  hexOutput: $(".output--hex input.output-text") as HTMLInputElement,
  cymkOutput: $(".output--cmyk input.output-text") as HTMLInputElement,
  rgbOutput: $(".output--rgb input.output-text") as HTMLInputElement,
  hsvOutput: $(".output--hsv input.output-text") as HTMLInputElement,
  hslOutput: $(".output--hsl input.output-text") as HTMLInputElement,
  allOutputTexts: $$("input.output-text") as HTMLInputElement[],
  copyBtn: $(".copy-btn") as HTMLElement,
};

const canvasContext = elements.panelCanvas.getContext("2d");

if (canvasContext == null) {
  throw new Error("Your Browser doesn't support canvas 2d rendering");
}

let previousHue: number = clampNumber(0, +elements.hueInput.value, 360);
let currentHue: number = previousHue;

let handlePosition = { x: 0, y: 0 };

let isHueFirstInput = true;
let hueInputTimeoutId: number | undefined;

elements.hueInput.addEventListener("input", () => {
  currentHue = clampNumber(0, +elements.hueInput.value, 360);

  if (isHueFirstInput) {
    const stop = onEveryAnimationFrame(() => {
      if (previousHue !== currentHue) {
        previousHue = currentHue;
        updatePanelCanvas(canvasContext, currentHue);
        pickColor();
      }
    });

    clearTimeout(hueInputTimeoutId);
    hueInputTimeoutId = setTimeout(() => {
      isHueFirstInput = true;
      stop();
    }, 100);
  }

  isHueFirstInput = false;

  updateHueInputThumbColor();
});

elements.panel.addEventListener("pointerdown", (event) => {
  const rect = elements.panel.getBoundingClientRect();

  const onMouseMove = (event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      handlePosition.x = clampNumber(0, event.x - rect.x, rect.width);
      handlePosition.y = clampNumber(0, event.y - rect.y, rect.height);
    } else {
      const touch = event.targetTouches[0];
      handlePosition.x = clampNumber(0, touch.clientX - rect.x, rect.width);
      handlePosition.y = clampNumber(0, touch.clientY - rect.y, rect.height);

      event.preventDefault();
    }

    elements.panelHandle.style.setProperty(
      "left",
      (handlePosition.x / rect.width) * 100 + "%"
    );
    elements.panelHandle.style.setProperty(
      "top",
      (handlePosition.y / rect.height) * 100 + "%"
    );

    pickColor();
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("touchmove", onMouseMove);
  };

  window.addEventListener("mousemove", onMouseMove, { passive: false });
  window.addEventListener("touchmove", onMouseMove, { passive: false });
  window.addEventListener("pointerup", onMouseUp, { once: true });

  onMouseMove(event);
});

function updateHueInputThumbColor() {
  elements.hueInput.style.setProperty(
    "--thumb-color",
    `hsl(${currentHue}deg, 100%, 50%)`
  );
}

function pickColor() {
  const panelRect = elements.panel.getBoundingClientRect();

  const x = handlePosition.x / panelRect.width;
  const y = handlePosition.y / panelRect.height;

  const saturation = x * 100;
  const value = 100 - y * 100;

  const rgb = colorConvert.hsv.rgb([currentHue, saturation, value]);

  outputColor(rgb);
}

function outputColor(rgb: RGB) {
  elements.preview.style.setProperty("background-color", `rgb(${rgb})`);

  const cmyk = colorConvert.rgb.cmyk(rgb);
  const hsl = colorConvert.rgb.hsl(rgb);
  const hsv = colorConvert.rgb.hsv(rgb);
  const hex = colorConvert.rgb.hex(rgb);

  elements.hexOutput.value = `${hex}`;
  elements.cymkOutput.value = `${cmyk.join("%, ")}`;
  elements.rgbOutput.value = `${rgb.join(", ")}`;
  elements.hsvOutput.value = `${hsv[0]}deg, ${hsv[1]}%, ${hsv[2]}%`;
  elements.hslOutput.value = `${hsl[0]}deg, ${hsl[1]}%, ${hsl[2]}%`;
}

elements.copyBtn.addEventListener("click", () => {
  try {
    navigator.clipboard.writeText(`#${elements.hexOutput.value}`);
  } catch {
    alert("Your browser doesn't support clipboard.");
  }
});

elements.allOutputTexts.forEach((outputText) => {
  outputText.addEventListener("click", () => {
    window.setTimeout(() => {
      const selection = window.getSelection();

      if (!selection) {
        return;
      }

      const range = document.createRange();
      range.selectNode(outputText);

      selection.removeAllRanges();
      selection.addRange(range);
    }, 0);
  });
});

updatePanelCanvas(canvasContext, currentHue);
pickColor();
updateHueInputThumbColor();
