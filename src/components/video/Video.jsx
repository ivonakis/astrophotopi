import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const cropOptions = {
  full: "",
  half: "0.25,0.25,0.5,0.5",
  20:   "0.4,0.4,0.2,0.2",
  10:   "0.45,0.45,0.1,0.1",
};

function Video() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [frame, setFrame] = useState("");
  const [crop, setCrop] = useState("full");
  const esRef = useRef(null);

  useEffect(() => () => esRef.current?.close(), []);

  function startStream() {
    const params = new URLSearchParams({ crop });
    const es = new EventSource(`/api/video/stream?${params}`);
    es.onmessage = (e) => setFrame("data:image/jpeg;base64," + e.data);
    es.onerror = () => stopStream();
    esRef.current = es;
    setIsStreaming(true);
  }

  function stopStream() {
    esRef.current?.close();
    esRef.current = null;
    setIsStreaming(false);
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Select value={crop} onValueChange={setCrop}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectGroup>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="half">Half</SelectItem>
              <SelectItem value="20">20%</SelectItem>
              <SelectItem value="10">10%</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Label>Crop</Label>
      </div>
      {isStreaming
        ? <Button variant="outline" className="self-start border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={stopStream}>Stop</Button>
        : <Button variant="outline" className="self-start" onClick={startStream}>Start</Button>
      }
      {frame && <img src={frame} className="w-full rounded" />}
    </>
  );
}

export default Video;
