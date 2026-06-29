import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import Histogram from "../histogram/Histogram";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const TARGET_P95 = 85;
const MAX_EXPOSURE_MS = 5000;

const resolutionArgs = {
  native: "",
  480:  " --width 640 --height 480",
  720:  " --width 1280 --height 720",
  1080: " --width 1920 --height 1080",
};

function computeP95(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const hist = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        hist[y]++;
      }
      const threshold = img.width * img.height * 0.95;
      let cumulative = 0;
      for (let v = 0; v < 256; v++) {
        cumulative += hist[v];
        if (cumulative >= threshold) { resolve(v); return; }
      }
      resolve(255);
    };
    img.src = dataUrl;
  });
}

function Flats() {
  const [exposure, setExposure] = useState(100);
  const [gain, setGain] = useState(1);
  const [response, setResponse] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAutoExposing, setIsAutoExposing] = useState(false);
  const [autoStatus, setAutoStatus] = useState("");
  const [autoExposeResolution, setAutoExposeResolution] = useState("480");
  const autoRef = useRef(false);

  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState([]);
  const [defaultPreset, setDefaultPreset] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetch('/api/presets/flats')
      .then(r => r.json())
      .then(data => {
        setPresets(data.presets ?? []);
        setDefaultPreset(data.default ?? null);
        if (data.default) {
          const p = data.presets?.find(p => p.name === data.default);
          if (p) applyPreset(p);
        }
      });
  }, []);

  function applyPreset(preset) {
    setPresetName(preset.name);
    setSelectedPreset(preset.name);
    setExposure(preset.exposure ?? 100);
    setGain(preset.gain ?? 1);
    setAutoExposeResolution(preset.autoExposeResolution ?? "480");
  }

  function savePreset() {
    if (!presetName) return;
    const preset = { name: presetName, exposure: Number(exposure), gain: Number(gain), autoExposeResolution };
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
    fetch('/api/presets/flats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default: newDefault, presets: updatedPresets }),
    });
  }

  function buildCommand(exp, g, res = "native") {
    let cmd = 'rpicam-still -n --awbgains 1,1';
    cmd += resolutionArgs[res] ?? "";
    cmd += ` --shutter ${Math.round(Number(exp) * 1000)}`; // ms → µs
    cmd += ` --gain ${Number(g)}`;
    cmd += ' --output -| base64';
    return cmd;
  }

  function captureWith(exp, res = "native") {
    return fetch('/api/capture/preview?' + new URLSearchParams({ command: buildCommand(exp, gain, res) }))
      .then(r => r.json());
  }

  async function capture() {
    setIsCapturing(true);
    try {
      const data = await captureWith(exposure);
      setResponse('data:image/jpeg;base64,' + data.binary);
    } finally {
      setIsCapturing(false);
    }
  }

  async function autoExpose() {
    autoRef.current = true;
    setIsAutoExposing(true);

    let currentExp = Math.max(1, Math.round(Number(exposure)));

    for (let i = 0; i < 10; i++) {
      if (!autoRef.current) break;

      setAutoStatus(`Shot ${i + 1}: ${currentExp}ms`);
      setExposure(currentExp);

      let data;
      try {
        data = await captureWith(currentExp, autoExposeResolution);
      } catch {
        break;
      }
      if (!autoRef.current) break;

      const dataUrl = 'data:image/jpeg;base64,' + data.binary;
      setResponse(dataUrl);

      const p95 = await computeP95(dataUrl);
      if (!autoRef.current) break;

      if (p95 === 0) {
        currentExp = Math.min(currentExp * 2, MAX_EXPOSURE_MS);
        continue;
      }

      const next = Math.max(1, Math.min(MAX_EXPOSURE_MS, Math.round(currentExp * TARGET_P95 / p95)));
      setAutoStatus(`Shot ${i + 1}: ${currentExp}ms → p95=${p95} → trying ${next}ms`);

      if (next === currentExp) break;
      currentExp = next;
    }

    setExposure(currentExp);
    setAutoStatus(`Done — ${currentExp}ms`);
    setIsAutoExposing(false);
    autoRef.current = false;
  }

  function stopAutoExpose() {
    autoRef.current = false;
  }

  const busy = isCapturing || isAutoExposing;
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
            <Input className="flex-1" placeholder="Preset name..." value={presetName} onChange={e => setPresetName(e.target.value)} />
            <Button variant="outline" className="self-start" disabled={!presetName} onClick={savePreset}>Save</Button>
          </div>
          <div className="flex items-center gap-3">
            <Input
              className="flex-1"
              type="number"
              min="1"
              max={MAX_EXPOSURE_MS}
              placeholder="Exposure (ms)"
              value={exposure}
              onChange={e => setExposure(e.target.value)}
            />
            <Label>Exposure (ms)</Label>
          </div>
          <div className="flex items-center gap-3">
            <Input
              className="flex-1"
              type="number"
              min="1"
              placeholder="Gain"
              value={gain}
              onChange={e => setGain(e.target.value)}
            />
            <Label>Gain</Label>
          </div>
          <div className="flex items-center gap-3">
            <Select value={autoExposeResolution} onValueChange={setAutoExposeResolution}>
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
            <Label>Auto-expose resolution</Label>
          </div>
        </>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" className="self-start" onClick={capture} disabled={busy}>
          {isCapturing ? 'Capturing...' : 'Capture'}
        </Button>
        {isAutoExposing
          ? <Button variant="outline" className="self-start border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={stopAutoExpose}>Stop</Button>
          : <Button variant="outline" className="self-start" onClick={autoExpose} disabled={busy}>Auto Expose</Button>
        }
        {autoStatus && <span className="text-sm text-muted-foreground">{autoStatus}</span>}
      </div>
      {response && <Histogram dataUrl={response} />}
    </>
  );
}

export default Flats;
