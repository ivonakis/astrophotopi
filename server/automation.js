import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const router = express.Router();

let session = null;
const sseClients = [];
let pauseResolve = null;
let nextStepResolve = null;
let skipStep = false;

const STEP_ORDER = ['lights', 'darks', 'flats', 'bias'];

const STEP_MESSAGES = {
  lights: 'Ready to capture lights. Ensure the camera is pointed at the target, then click Start.',
  darks:  'Lights complete. Put the lens cap on to block all light, then click Start.',
  flats:  'Darks complete. Remove the lens cap and point the camera at a uniform light source (dawn sky or light panel), then click Start.',
  bias:   'Flats complete. Keep the flat light source setup — biases use minimum exposure. Click Start.',
  done:   'All frames captured successfully.',
};

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => res.write(payload));
}

router.get('/status', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  sseClients.push(res);
  if (session) res.write(`data: ${JSON.stringify(session)}\n\n`);
  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

router.post('/start', (req, res) => {
  if (session?.state === 'running') return res.status(409).json({ error: 'Already running' });

  const { scene, lights, darks, flats, bias } = req.body;
  const outputDir = `./data/scenes/${scene}`;

  STEP_ORDER.forEach(dir => fs.mkdirSync(path.join(outputDir, dir), { recursive: true }));

  function countImages(step) {
    return fs.readdirSync(path.join(outputDir, step)).filter(f => /\.dng$/i.test(f)).length;
  }

  const firstStep = STEP_ORDER.find(s => ({ lights, darks, flats, bias })[s]?.count > 0) ?? 'lights';
  session = {
    state: 'waiting_next_step',
    currentStep: firstStep,
    outputDir,
    scene,
    message: STEP_MESSAGES[firstStep] ?? `Ready to capture ${firstStep}. Click Start.`,
    steps: {
      lights: { count: lights.count, captured: countImages('lights'), exposureS: lights.exposure, gain: lights.gain },
      darks:  { count: darks.count,  captured: countImages('darks'),  exposureS: darks.exposure,  gain: darks.gain  },
      flats:  { count: flats.count,  captured: countImages('flats'),  exposureMs: flats.exposureMs, gain: flats.gain },
      bias:   { count: bias.count,   captured: countImages('bias'),   gain: bias.gain },
    },
  };

  broadcast(session);
  res.json({ ok: true, outputDir });
});

router.post('/stop', (req, res) => {
  if (!session || !['running'].includes(session.state)) return res.status(400).json({ error: 'Not running' });
  session.state = 'paused';
  broadcast(session);
  res.json({ ok: true });
});

router.post('/resume', (req, res) => {
  if (!session || session.state !== 'paused') return res.status(400).json({ error: 'Not paused' });
  session.state = 'running';
  broadcast(session);
  if (pauseResolve) { pauseResolve(); pauseResolve = null; }
  res.json({ ok: true });
});

router.post('/next-step', (req, res) => {
  if (!session || !['paused', 'waiting_next_step'].includes(session.state))
    return res.status(400).json({ error: 'Cannot go to next step from current state' });

  if (session.state === 'paused') {
    // Skip remaining frames — loop will break and reach waiting_next_step naturally
    skipStep = true;
    session.state = 'running';
    broadcast(session);
    if (pauseResolve) { pauseResolve(); pauseResolve = null; }
  } else {
    if (nextStepResolve) {
      // Normal flow — loop is running and waiting between steps
      nextStepResolve(); nextStepResolve = null;
    } else {
      // Loop is not running (restart scenario) — start it now
      session.state = 'running';
      session.message = '';
      broadcast(session);
      runCapture().catch(err => {
        console.error('Automation error:', err);
        if (session) { session.state = 'error'; session.message = err.message; broadcast(session); }
      });
    }
  }
  res.json({ ok: true });
});

function waitForResume() {
  return new Promise(resolve => { pauseResolve = resolve; });
}

function waitForNextStep() {
  return new Promise(resolve => { nextStepResolve = resolve; });
}

function captureFrame(step, index) {
  return new Promise((resolve, reject) => {
    const s = session.steps[step];
    const n = String(index + 1).padStart(4, '0');
    const frameName = `${step.replace(/s$/, '')}_${n}.jpg`;
    const outPath = path.join(session.outputDir, step, frameName);

    let shutterUs;
    if (step === 'bias') shutterUs = 100;
    else if (step === 'flats') shutterUs = Math.round(s.exposureMs * 1000);
    else shutterUs = Math.round(s.exposureS * 1000000);

    const args = ['-n', '--awb', 'off', '--shutter', String(shutterUs), '--gain', String(s.gain), '--raw', '-o', outPath];
    const proc = spawn('rpicam-still', args);
    proc.stderr.on('data', d => console.error('rpicam-still:', d.toString()));
    proc.on('exit', code => code === 0 ? resolve() : reject(new Error(`rpicam-still exited with ${code}`)));
  });
}

async function runCapture() {
  for (const step of STEP_ORDER) {
    if (!session) break;
    const stepData = session.steps[step];
    if (stepData.count === 0 || stepData.captured >= stepData.count) continue;

    session.currentStep = step;
    session.message = '';
    broadcast(session);

    for (let i = stepData.captured; i < stepData.count; i++) {
      while (session?.state === 'paused') await waitForResume();
      if (skipStep) { skipStep = false; break; }
      if (!session || session.state === 'stopped') return;

      session.state = 'running';
      broadcast(session);

      await captureFrame(step, i);
      stepData.captured++;
      broadcast(session);
    }

    // Find the next step that has frames to capture
    const nextStep = STEP_ORDER.slice(STEP_ORDER.indexOf(step) + 1).find(s => session.steps[s].count > 0);
    if (nextStep) {
      session.currentStep = nextStep;
      session.state = 'waiting_next_step';
      session.message = STEP_MESSAGES[nextStep];
      broadcast(session);
      await waitForNextStep();
      session.message = '';
    }
  }

  if (session) {
    session.state = 'done';
    session.message = STEP_MESSAGES.done + ` Session saved to: ${session.outputDir}`;
    broadcast(session);
  }
}

router.post('/restart', (req, res) => {
  if (!session) return res.status(400).json({ error: 'No session' });
  const firstIncomplete = STEP_ORDER.find(s => session.steps[s].count > 0 && session.steps[s].captured < session.steps[s].count);
  if (!firstIncomplete) return res.status(400).json({ error: 'All steps complete' });
  session.currentStep = firstIncomplete;
  session.state = 'waiting_next_step';
  session.message = STEP_MESSAGES[firstIncomplete] ?? `Ready to capture ${firstIncomplete}. Click Start.`;
  broadcast(session);
  res.json({ ok: true });
});

export default router;
