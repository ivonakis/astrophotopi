import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import Histogram from "../histogram/Histogram";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

function Exposure() {
  const [exposure, setExposure] = useState(30);
  const [gain, setGain] = useState(1);
  const [response, setResponse] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState([]);
  const [defaultPreset, setDefaultPreset] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetch('/api/presets/exposure')
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
    setExposure(preset.exposure ?? 30);
    setGain(preset.gain ?? 1);
  }

  function savePreset() {
    if (!presetName) return;
    const preset = { name: presetName, exposure: Number(exposure), gain: Number(gain) };
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
    fetch('/api/presets/exposure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default: newDefault, presets: updatedPresets }),
    });
  }

  function buildCommand() {
    let cmd = 'rpicam-still -n --awbgains 1,1';
    cmd += ` --shutter ${Math.round(Number(exposure) * 1000000)}`;
    cmd += ` --gain ${Number(gain)}`;
    cmd += ' --output -| base64';
    return cmd;
  }

  function capture() {
    setIsCapturing(true);
    fetch('/api/capture/preview?' + new URLSearchParams({ command: buildCommand() }))
      .then(r => r.json())
      .then(data => {
        setResponse('data:image/jpeg;base64,' + data.binary);
        setIsCapturing(false);
      })
      .catch(() => setIsCapturing(false));
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
            <Input className="flex-1" placeholder="Preset name..." value={presetName} onChange={e => setPresetName(e.target.value)} />
            <Button variant="outline" className="self-start" disabled={!presetName} onClick={savePreset}>Save</Button>
          </div>
          <div className="flex items-center gap-3">
            <Input
              className="flex-1"
              type="number"
              min="0"
              placeholder="Exposure (s)"
              value={exposure}
              onChange={e => setExposure(e.target.value)}
            />
            <Label>Exposure (s)</Label>
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
        </>
      )}
      <Button variant="outline" className="self-start" onClick={capture} disabled={isCapturing}>
        {isCapturing ? 'Capturing...' : 'Capture'}
      </Button>
      {response && <Histogram dataUrl={response} />}
    </>
  );
}

export default Exposure;
