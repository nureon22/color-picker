/// <reference lib="webworker" />

self.onmessage = (event) => {
  const { data } = event;

  if (typeof data !== "object") {
    console.error("data passed to this worker must be object");

    return;
  }

  const { hue, width, height } = data;

  const imageDataArr = generateCanvasImageData(hue, width, height);

  self.postMessage(new ImageData(imageDataArr, width, height));
};

function generateCanvasImageData(hue: number, width: number, height: number) {
  const arr = new Uint8ClampedArray(width * height * 4);

  for (let x = 0; x < width; x++) {
    const saturation = x / width;

    for (let y = 0; y < height; y++) {
      const value = 1 - y / height;

      const index = (y * width + x) * 4;

      const rgb = hsvToRgb([hue, saturation * 100, value * 100]);

      arr[index] = rgb[0];
      arr[index + 1] = rgb[1];
      arr[index + 2] = rgb[2];
      arr[index + 3] = 255;
    }
  }

  return arr;
}

// copy from color-convert.
function hsvToRgb(hsv: [number, number, number]) {
  const h = hsv[0] / 60;
  const s = hsv[1] / 100;
  let v = hsv[2] / 100;
  const hi = Math.floor(h) % 6;

  const f = h - Math.floor(h);
  const p = 255 * v * (1 - s);
  const q = 255 * v * (1 - s * f);
  const t = 255 * v * (1 - s * (1 - f));
  v *= 255;

  switch (hi) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    case 5:
      return [v, p, q];
    default:
      return [0, 0, 0];
  }
}
