import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [hasPreview, setHasPreview] = useState(false);
  const [response, setResponse] = useState("");
  const [resolution, setResolution] = useState("native");
  const [crop, setCrop] = useState("full");
  const [exposure, setExposure] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingRef = useRef(false);

  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState([]);
  const [defaultPreset, setDefaultPreset] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const command = buildCommand();

  useEffect(() => {
    fetch('/api/presets/focus')
      .then(r => r.json())
      .then(data => {
        setPresets(data.presets ?? []);
        setDefaultPreset(data.default ?? null);
        if (data.default) {
          const preset = data.presets?.find(p => p.name === data.default);
          if (preset) applyPreset(preset);
        }
      });
  }, []);

  function applyPreset(preset) {
    setPresetName(preset.name);
    setSelectedPreset(preset.name);
    setHasPreview(preset.hasPreview ?? false);
    setResolution(preset.resolution ?? "native");
    setCrop(preset.crop ?? "full");
    setExposure(preset.exposure ?? 0);
  }

  function savePreset() {
    if (!presetName) return;
    const preset = { name: presetName, hasPreview, resolution, crop, exposure: Number(exposure) };
    const updatedPresets = [...presets.filter(p => p.name !== presetName), preset];
    persistPresets(updatedPresets, defaultPreset);
    setPresets(updatedPresets);
    setSelectedPreset(presetName);
  }

  function setAsDefault() {
    if (!selectedPreset) return;
    persistPresets(presets, selectedPreset);
    setDefaultPreset(selectedPreset);
  }

  function deletePreset() {
    if (!selectedPreset) return;
    const updatedPresets = presets.filter(p => p.name !== selectedPreset);
    const newDefault = defaultPreset === selectedPreset ? null : defaultPreset;
    persistPresets(updatedPresets, newDefault);
    setPresets(updatedPresets);
    setDefaultPreset(newDefault);
    setSelectedPreset("");
    setPresetName("");
  }

  function persistPresets(updatedPresets, newDefault) {
    fetch('/api/presets/focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default: newDefault, presets: updatedPresets }),
    });
  }

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

  function buildCommand() {
    let newCommand = "rpicam-still";
    newCommand += hasPreview ? " " : " -n";
    newCommand += resolutions[resolution];
    newCommand += cropOptions[crop];
    newCommand += " --immediate --awbgains 1,1";
    newCommand += exposure > 0 ? ` --shutter ${exposure * 1000000} --gain 1` : "";
    newCommand += " --output -| base64";
    return newCommand;
  }

  const settingsVisible = presets.length === 0 || showSettings;

  return (
    <>
      {presets.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedPreset} onValueChange={name => { setSelectedPreset(name); const p = presets.find(p => p.name === name); if (p) applyPreset(p); }}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select preset..." />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectGroup>
                {presets.map(p => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}{defaultPreset === p.name ? " ★" : ""}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline" className="self-start" disabled={!selectedPreset} onClick={setAsDefault}>Set Default</Button>
          <Button variant="outline" className="self-start border-red-500 text-red-500 hover:bg-red-500 hover:text-white" disabled={!selectedPreset} onClick={deletePreset}>Delete</Button>
        </div>
      )}
      {presets.length > 0 && (
        <Button variant="ghost" className="self-start flex items-center gap-1 text-sm" onClick={() => setShowSettings(s => !s)}>
          {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Settings
        </Button>
      )}
      {settingsVisible && (
        <>
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder="Preset name..."
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
            />
            <Button variant="outline" className="self-start" disabled={!presetName} onClick={savePreset}>Save</Button>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="hasPreview" checked={hasPreview} onCheckedChange={setHasPreview}></Checkbox>
            <Label htmlFor="hasPreview">Preview on screen(disabled by default)</Label>
          </div>
          <div className="flex items-center gap-3">
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectGroup>
                  <SelectItem value="native">Native</SelectItem>
                  <SelectItem value="480">640x480</SelectItem>
                  <SelectItem value="720">1280x720</SelectItem>
                  <SelectItem value="1080">1920x1080</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Label>Resolution</Label>
          </div>
          <div className="flex items-center gap-3">
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectGroup>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="half">Half</SelectItem>
                  <SelectItem value="20">20 percent</SelectItem>
                  <SelectItem value="10">10 percent</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Label>Crop</Label>
          </div>
          <div className="flex items-center gap-3">
            <Input
              className="flex-1"
              type="number"
              min="0"
              max="200"
              placeholder="Exposure (s)"
              value={exposure}
              onChange={e => setExposure(Number(e.target.value))}
            />
            <Label>Exposure (s)</Label>
          </div>
        </>
      )}
      <span>{command}</span>
      {isStreaming
        ? <Button variant="outline" onClick={stopPreview} className="self-start border-red-500 text-red-500 hover:bg-red-500 hover:text-white">Stop</Button>
        : <Button onClick={startPreview} variant="outline" className="self-start">Preview</Button>
      }
      {response && (
        <div>
          <Histogram dataUrl={response}></Histogram>
        </div>
      )}
    </>
  );
}


export default Preview;
