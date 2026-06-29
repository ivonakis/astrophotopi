import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const STEP_LABELS = { lights: 'Lights', darks: 'Darks', flats: 'Flats', bias: 'Bias' };
const STEP_ORDER = ['lights', 'darks', 'flats', 'bias'];

function Automation({ scene }) {
  const [status, setStatus] = useState(null);
  const esRef = useRef(null);

  // Counts profile
  const [lightsCount, setLightsCount] = useState(100);
  const [darksCount, setDarksCount] = useState(50);
  const [flatsCount, setFlatsCount] = useState(20);
  const [biasCount, setBiasCount] = useState(20);

  // Effective settings loaded from other tabs' defaults
  const [exposureDefaults, setExposureDefaults] = useState(null);
  const [flatsDefaults, setFlatsDefaults] = useState(null);

  // Preset management
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState([]);
  const [defaultPreset, setDefaultPreset] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // SSE connection
  useEffect(() => {
    const es = new EventSource('/api/automation/status');
    es.onmessage = e => setStatus(JSON.parse(e.data));
    esRef.current = es;
    return () => es.close();
  }, []);

  // Load presets and effective settings from other tabs
  useEffect(() => {
    fetch('/api/presets/automation')
      .then(r => r.json())
      .then(data => {
        setPresets(data.presets ?? []);
        setDefaultPreset(data.default ?? null);
        if (data.default) {
          const p = data.presets?.find(p => p.name === data.default);
          if (p) applyPreset(p);
        }
      });

    fetch('/api/presets/exposure')
      .then(r => r.json())
      .then(data => {
        const def = data.presets?.find(p => p.name === data.default);
        setExposureDefaults(def ?? { exposure: 30, gain: 1 });
      });

    fetch('/api/presets/flats')
      .then(r => r.json())
      .then(data => {
        const def = data.presets?.find(p => p.name === data.default);
        setFlatsDefaults(def ?? { exposure: 100, gain: 1 });
      });
  }, []);

  function applyPreset(preset) {
    setPresetName(preset.name);
    setSelectedPreset(preset.name);
    setLightsCount(preset.lightsCount ?? 100);
    setDarksCount(preset.darksCount ?? 50);
    setFlatsCount(preset.flatsCount ?? 20);
    setBiasCount(preset.biasCount ?? 20);
  }

  function savePreset() {
    if (!presetName) return;
    const preset = { name: presetName, lightsCount: Number(lightsCount), darksCount: Number(darksCount), flatsCount: Number(flatsCount), biasCount: Number(biasCount) };
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
    fetch('/api/presets/automation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default: newDefault, presets: updatedPresets }),
    });
  }

  function start() {
    const exp = exposureDefaults ?? { exposure: 30, gain: 1 };
    const flt = flatsDefaults ?? { exposure: 100, gain: 1 };
    fetch('/api/automation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene,
        lights: { count: Number(lightsCount), exposure: exp.exposure,   gain: exp.gain },
        darks:  { count: Number(darksCount),  exposure: exp.exposure,   gain: exp.gain },
        flats:  { count: Number(flatsCount),  exposureMs: flt.exposure, gain: flt.gain },
        bias:   { count: Number(biasCount),   gain: exp.gain },
      }),
    });
  }

  const stop      = () => fetch('/api/automation/stop',      { method: 'POST' });
  const resume    = () => fetch('/api/automation/resume',    { method: 'POST' });
  const nextStep  = () => fetch('/api/automation/next-step', { method: 'POST' });

  const activeStatus = status?.scene === scene ? status : null;

  const isRunning  = activeStatus?.state === 'running';
  const isPaused   = activeStatus?.state === 'paused';
  const isWaiting  = activeStatus?.state === 'waiting_next_step';
  const isDone     = activeStatus?.state === 'done';
  const isActive   = isRunning || isPaused || isWaiting;
  const hasUnfinished = isDone && activeStatus && Object.values(activeStatus.steps).some(s => s.count > 0 && s.captured < s.count);
  const settingsVisible = presets.length === 0 || showSettings;

  return (
    <>
      {/* Preset row */}
      {presets.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedPreset} onValueChange={name => { setSelectedPreset(name); const p = presets.find(p => p.name === name); if (p) applyPreset(p); }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select preset..." /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectGroup>
                {presets.map(p => (
                  <SelectItem key={p.name} value={p.name}>{p.name}{defaultPreset === p.name ? ' ★' : ''}</SelectItem>
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

      {/* Settings */}
      {settingsVisible && (
        <>
          <div className="flex items-center gap-2">
            <Input className="flex-1" placeholder="Preset name..." value={presetName} onChange={e => setPresetName(e.target.value)} />
            <Button variant="outline" className="self-start" disabled={!presetName} onClick={savePreset}>Save</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Lights', lightsCount, setLightsCount],
              ['Darks',  darksCount,  setDarksCount],
              ['Flats',  flatsCount,  setFlatsCount],
              ['Bias',   biasCount,   setBiasCount],
            ].map(([label, val, setter]) => (
              <div key={label} className="flex items-center gap-2">
                <Input type="number" min="0" className="w-24" value={val} onChange={e => setter(e.target.value)} />
                <Label>{label}</Label>
              </div>
            ))}
          </div>
          {/* Show effective settings */}
          <div className="text-sm text-muted-foreground flex flex-col gap-1 border rounded p-2">
            <span className="font-medium text-foreground">Effective settings (from defaults)</span>
            <span>Lights / Darks — {exposureDefaults ? `${exposureDefaults.exposure}s, gain ${exposureDefaults.gain}` : 'no default preset set'}</span>
            <span>Flats — {flatsDefaults ? `${flatsDefaults.exposure}ms, gain ${flatsDefaults.gain}` : 'no default preset set'}</span>
            <span>Bias — minimum exposure (100µs), same gain as lights</span>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isActive && !isDone && (
          <Button variant="outline" className="self-start" onClick={start}>Start</Button>
        )}
        {hasUnfinished && (
          <Button variant="outline" className="self-start" onClick={() => fetch('/api/automation/restart', { method: 'POST' })}>Next Step</Button>
        )}
        {isRunning && (
          <Button variant="outline" className="self-start border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={stop}>Stop</Button>
        )}
        {isPaused && (
          <>
            <Button variant="outline" className="self-start" onClick={resume}>Resume</Button>
            <Button variant="outline" className="self-start" onClick={nextStep}>Next Step →</Button>
          </>
        )}
        {isWaiting && (
          <Button variant="outline" className="self-start" onClick={nextStep}>Start</Button>
        )}
      </div>

      {/* Status display */}
      {activeStatus && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">
            {isRunning && `Capturing: ${STEP_LABELS[activeStatus.currentStep]}`}
            {isPaused && `Paused on: ${STEP_LABELS[activeStatus.currentStep]}`}
            {isWaiting && `Next: ${STEP_LABELS[activeStatus.currentStep]}`}
            {isDone && 'Session complete'}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {STEP_ORDER.map(step => {
              const s = activeStatus.steps[step];
              const isCurrent = activeStatus.currentStep === step;
              const isDoneStep = s.captured >= s.count && s.count > 0;
              const isPast = STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(activeStatus.currentStep) && isDoneStep;
              const cardClass = isCurrent
                ? 'border-2 border-blue-500 bg-blue-50'
                : isPast
                  ? 'border-2 border-green-500 bg-green-50'
                  : 'border-2 border-gray-200';
              const barClass = isDoneStep ? 'h-full rounded bg-green-500' : 'h-full rounded bg-blue-500';
              return (
                <div key={step} className={`rounded p-2 flex flex-col gap-1 text-sm ${cardClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{STEP_LABELS[step]}</span>
                    {isCurrent && <span className="text-xs text-blue-600 font-bold">▶</span>}
                    {isPast && <span className="text-xs text-green-600">✓</span>}
                  </div>
                  {s.count > 0
                    ? <>
                        <span className={isCurrent ? 'text-blue-700 font-medium' : ''}>{s.captured} / {s.count}</span>
                        <div className="h-1.5 rounded bg-gray-200 overflow-hidden">
                          <div className={barClass} style={{ width: `${(s.captured / s.count) * 100}%` }} />
                        </div>
                      </>
                    : <span className="text-gray-400 text-xs">skipped</span>
                  }
                </div>
              );
            })}
          </div>

          {activeStatus.message && (
            <div className="border rounded p-3 bg-yellow-50 text-yellow-900 text-sm">
              {activeStatus.message}
            </div>
          )}

          {activeStatus.outputDir && (
            <span className="text-xs text-muted-foreground">Output: {activeStatus.outputDir}</span>
          )}
        </div>
      )}
    </>
  );
}

Automation.propTypes = {
  scene: PropTypes.string.isRequired,
};

export default Automation;
