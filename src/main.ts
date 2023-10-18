import colorConvert from "color-convert";
import "./style.css";
import { RGB } from "color-convert/conversions";

// # Predefined functions
// ----------

function updatePanelCanvas(canvas: HTMLCanvasElement, hue: number) {
  hue = clampNumber(0, hue, 360);

  const context = canvas.getContext("2d");

  if (context == null) {
    return;
  }

  const { width, height } = canvas;
  const imageData = generateCanvasImageData(hue, width, height);

  context.putImageData(imageData, 0, 0);
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

const panelCanvas = $(".panel-canvas") as HTMLCanvasElement;
const panelHandle = $(".panel-handle") as HTMLElement;
const panel = $(".panel") as HTMLElement;
const preview = $(".preview") as HTMLElement;
const hueInput = $("input.hue-input") as HTMLInputElement;
const hexOutput = $(".output--hex input.output-text") as HTMLInputElement;
const cymkOutput = $(".output--cmyk input.output-text") as HTMLInputElement;
const rgbOutput = $(".output--rgb input.output-text") as HTMLInputElement;
const hsvOutput = $(".output--hsv input.output-text") as HTMLInputElement;
const hslOutput = $(".output--hsl input.output-text") as HTMLInputElement;
const allOutputTexts = $$("input.output-text") as HTMLInputElement[];
const copyBtn = $(".copy-btn") as HTMLElement;

let previousHue: number = clampNumber(0, +hueInput.value, 360);
let currentHue: number = previousHue;

let handlePosition = { x: 0, y: 0 };

let isHueFirstInput = true;
let hueInputTimeoutId: number | undefined;

hueInput.addEventListener("input", () => {
  currentHue = clampNumber(0, +hueInput.value, 360);

  if (isHueFirstInput) {
    const stop = onEveryAnimationFrame(() => {
      if (previousHue !== currentHue) {
        previousHue = currentHue;
        updatePanelCanvas(panelCanvas, currentHue);
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

panel.addEventListener("pointerdown", () => {
  const rect = panel.getBoundingClientRect();

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

    panelHandle.style.setProperty("left", handlePosition.x / rect.width * 100 + "%");
    panelHandle.style.setProperty("top", handlePosition.y / rect.height * 100 + "%");

    pickColor();
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("touchmove", onMouseMove);
  };

  window.addEventListener("mousemove", onMouseMove, { passive: false });
  window.addEventListener("touchmove", onMouseMove, { passive: false });
  window.addEventListener("pointerup", onMouseUp, { once: true });
});

function updateHueInputThumbColor() {
  hueInput.style.setProperty(
    "--thumb-color",
    `hsl(${currentHue}deg, 100%, 50%)`
  );
}

function pickColor() {
  const panelRect = panel.getBoundingClientRect();

  const x = handlePosition.x / panelRect.width;
  const y = handlePosition.y / panelRect.height;

  const saturation = x * 100;
  const value = 100 - y * 100;

  const rgb = colorConvert.hsv.rgb([currentHue, saturation, value]);

  outputColor(rgb);
}

function outputColor(rgb: RGB) {
  preview.style.setProperty("background-color", `rgb(${rgb})`);

  const cmyk = colorConvert.rgb.cmyk(rgb);
  const hsl = colorConvert.rgb.hsl(rgb);
  const hsv = colorConvert.rgb.hsv(rgb);
  const hex = colorConvert.rgb.hex(rgb);

  hexOutput.value = `${hex}`;
  cymkOutput.value = `${cmyk.join("%, ")}`;
  rgbOutput.value = `${rgb.join(", ")}`;
  hsvOutput.value = `${hsv[0]}deg, ${hsv[1]}%, ${hsv[2]}%`;
  hslOutput.value = `${hsl[0]}deg, ${hsl[1]}%, ${hsl[2]}%`;
}

copyBtn.addEventListener("click", () => {
  try {
    navigator.clipboard.writeText(`#${hexOutput.value}`);
  } catch {
    alert("Your browser doesn't support clipboard.");
  }
});

allOutputTexts.forEach((outputText) => {
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

updatePanelCanvas(panelCanvas, currentHue);
pickColor();
updateHueInputThumbColor();
