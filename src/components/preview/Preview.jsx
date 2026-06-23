import { useState, useRef } from "react";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import Histogram from "../histogram/Histogram";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const resolutions = {
  native: "",
  480: " --width 640 --height 480",
  720: " --width 1280 --height 720",
  1080: " --width 1920 --height 1080",
};

const cropOptions = {
  full: "",
  half: " --roi 0.25,0.25,0.5,0.5",
  20: " --roi 0.4,0.4,0.2,0.2",
  10: " --roi 0.45,0.45,0.1,0.1",
};
function Preview() {
  //   const [command, setCommand] = useState(
  //     "rpicam-still -n --width 640 --height 480 --output -| base64"
  //   );
  const [hasPreview, setHasPreview] = useState(false);
  const [response, setResponse] = useState("");
  const [resolution, setResolution] = useState("native");
  const [crop, setCrop] = useState("full");
  const [exposure, setExposure] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingRef = useRef(false);

  const command = buildCommand();

  function loop(cmd) {
    if (!streamingRef.current) return;
    fetch("/api/capture/preview?" + new URLSearchParams({ command: cmd }))
      .then((res) => res.json())
      .then((data) => {
        setResponse("data:image/jpeg;base64," + data.binary);
        loop(cmd);
      })
      .catch((error) => {
        console.log(error);
        streamingRef.current = false;
        setIsStreaming(false);
      });
  }

  function startPreview() {
    streamingRef.current = true;
    setIsStreaming(true);
    loop(command);
  }

  function stopPreview() {
    streamingRef.current = false;
    setIsStreaming(false);
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setResponse(e.target.result);
    reader.readAsDataURL(file);
  };
  //   function handleCommandChange(event) {
  //     // console.log(event.target.value);
  //     setCommand(event.target.value);
  //   }

  function handleHasPreviewChange(checked) {
    setHasPreview(checked);
  }

  function handleResolutionChange(value) {
    setResolution(value);
  }

  function handleExposure(event) {
    setExposure(event.target.value);
  }

  function buildCommand() {
    let newCommand = "rpicam-still";
    newCommand += hasPreview ? " " : " -n";
    newCommand += resolutions[resolution];
    newCommand += cropOptions[crop];
    newCommand += " --immediate --awbgains 1,1";
    newCommand +=
      exposure > 0
        ? " --shutter 100000000 --gain 1"
        : "";
    newCommand += " --output -| base64";
    return newCommand;
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Checkbox
          id="hasPreview"
          checked={hasPreview}
          onCheckedChange={handleHasPreviewChange}
        ></Checkbox>
        <Label htmlFor="hasPreview">
          Preview on screen(disabled by default)
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <Select
          id="resolution"
          onValueChange={handleResolutionChange}
          defaultValue={resolution}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectGroup>
              <SelectItem value="native">Native</SelectItem>
              <SelectItem value="480">640x480</SelectItem>
              <SelectItem value="720">1280x720</SelectItem>
              <SelectItem value="1080">1920x1080</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Label htmlFor="resolution">Resolution</Label>
      </div>
      <div className="flex items-center gap-3">
        <Select id="crop" onValueChange={setCrop} defaultValue={crop}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectGroup>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="half">Half</SelectItem>
              <SelectItem value="20">20 percent</SelectItem>
              <SelectItem value="10">10 percent</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Label htmlFor="crop">Crop</Label>
      </div>
      <div className="flex items-center gap-3">
        <Input
          className="flex-1"
          type="number"
          min="0"
          max="200"
          placeholder="Exposure"
          defaultValue={exposure}
          onChange={handleExposure}
        />
      </div>
      {/* <FocusHelper></FocusHelper> */}
      {response && (
        <div>
          <Histogram dataUrl={response}></Histogram>
        </div>
      )}
      <span>{command}</span>
      {/* <input type="text" value={command} onChange={handleCommandChange} /> */}
      {isStreaming
        ? <Button variant="destructive" onClick={stopPreview} variant="outline" className="self-start">Stop</Button>
        : <Button onClick={startPreview} variant="outline" className="self-start">Preview</Button>
      }
      or
      <input type="file" accept="image/jpeg" onChange={handleImageUpload} />
    </>
  );
}

export default Preview;
