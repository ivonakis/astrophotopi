import { useRef, useEffect } from "react";

function Histogram(props) {
  const imageUrl = props.dataUrl;
  const canvasRef = useRef(null);

  const drawImageAndHistogram = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      // Draw image to canvas
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Extract pixels
      const { width, height } = img;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const sharpness = varianceOfLaplacian(imageData);

      // Compute R, G, B histograms
      const histR = new Array(256).fill(0);
      const histG = new Array(256).fill(0);
      const histB = new Array(256).fill(0);

      for (let i = 0; i < data.length; i += 4) {
        histR[data[i]]++;
        histG[data[i + 1]]++;
        histB[data[i + 2]]++;
      }

      const scale = Math.round(width / window.innerWidth);

      // Normalize and draw histogram overlay

      const histWidth = 256 * scale;
      const histHeight = 100 * scale;
      const offsetX = 20;
      const offsetY = 20;
      const maxVal = Math.max(...histR, ...histG, ...histB);
      const barWidth = histWidth / 256;

      // Background for visibility
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(offsetX - 10, offsetY - 10, histWidth + 20, histHeight + 20);

      const drawChannel = (hist, color) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 * scale;
        for (let i = 0; i < 256; i++) {
          const x = offsetX + i * barWidth;
          const y = offsetY + histHeight - (hist[i] / maxVal) * histHeight;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      console.log(histR);
      drawChannel(histR, "red");
      drawChannel(histG, "lime");
      drawChannel(histB, "cyan");
      ctx.font = `${25* scale}px Arial`;
      ctx.fillStyle = "green";
      ctx.fillText("Sharpness: " + sharpness, 10, histHeight + 80 + 25* scale);
    };
  };

  function varianceOfLaplacian(imageData) {
    const { data, width, height } = imageData;

    // ---- 1. convert to grayscale array ----
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // ---- 2. Laplacian kernel ----
    const kernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];

    const lap = new Float32Array(width * height);

    // ---- 3. Apply Laplacian convolution ----
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        let k = 0;

        // apply 3x3 kernel
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = gray[(y + ky) * width + (x + kx)];
            sum += kernel[k++] * pixel;
          }
        }

        lap[y * width + x] = sum;
      }
    }

    // ---- 4. Compute variance ----
    let mean = 0;
    for (let i = 0; i < lap.length; i++) {
      mean += lap[i];
    }
    mean /= lap.length;

    let variance = 0;
    for (let i = 0; i < lap.length; i++) {
      variance += (lap[i] - mean) ** 2;
    }
    variance /= lap.length;

    return variance;
  }

  useEffect(() => {
    drawImageAndHistogram();
  });

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-xl font-bold">JPEG Histogram Visualizer</h1>
      <canvas
        ref={canvasRef}
        className="border rounded shadow"
        style={{ maxWidth: "100%", height: "auto" }}
      />
    </div>
  );
}

export default Histogram;
