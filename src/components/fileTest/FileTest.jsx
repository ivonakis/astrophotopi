import { useRef, useState } from "react";

function FileTest() {
  const [imageUrl, setImageUrl] = useState("");
  const canvasRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target.result);
    reader.readAsDataURL(file);
  };

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
          const y =
            offsetY + histHeight - (hist[i] / maxVal) * histHeight;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      console.log(histR);
      drawChannel(histR, "red");
      drawChannel(histG, "lime");
      drawChannel(histB, "cyan");
    };
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-xl font-bold">JPEG Histogram Visualizer</h1>
      <input type="file" accept="image/jpeg" onChange={handleImageUpload} />
      {imageUrl && (
        <>
          <canvas
            ref={canvasRef}
            className="border rounded shadow"
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <button
            onClick={drawImageAndHistogram}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Draw Histogram
          </button>
        </>
      )}
    </div>
  );
}

export default FileTest;
