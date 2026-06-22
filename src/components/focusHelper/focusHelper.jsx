import { useState, useRef } from "react";

function FocusHelper() {
    const w  = 4056;
    const h = 3040;
  const [selectedFile, setSelectedFile] = useState(null);
  const [sharpnessScore, setSharpnessScore] = useState(0);
  const can = useRef(null)
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);

    if (file) {
      console.log("File selected:", file.name);
      // Example: read the file content
      const reader = new FileReader();
      reader.onload = (e) => {
        //console.log("File content:", e.target.result);
        const image = new Image();
        image.src = e.target.result;
        
        const canvas = can.current;
        const ctx = canvas.getContext("2d");
        // ctx.drawImage(image, 10,10,400, 400);
        ctx.fillStyle = "green";
        ctx.fillRect(20, 10, 150, 100);
        image.addEventListener("load", () => {
            ctx.drawImage(image,0,0);
            console.log(canvas.width); // 300
            const imageData = ctx.getImageData(0,0, w, h).data;
            const pixels = w * h -4;
            console.log(typeof imageData);
            let sharpness = 0;
            for (let i= 0; i < pixels; i++) {
                sharpness += Math.abs(imageData[i]- imageData[i+4]);

            }
            setSharpnessScore(sharpness);
        });
      };
      reader.readAsDataURL(file); // or readAsDataURL, readAsArrayBuffer, etc.
    }
  };
  return (
    <>
      <h1>Focus Helper</h1>
      <input id="test" type="file" onChange={handleFileChange}></input>
      {selectedFile && <p>Selected: {selectedFile.name}</p>}
      <p>Sharpness score: {sharpnessScore}</p>
        {/* {dataUrl && <img src={dataUrl}/>} */}
        <canvas ref={can} width={w} height={h}></canvas>
    </>
  );
}

export default FocusHelper;
