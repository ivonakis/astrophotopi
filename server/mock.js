import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const SCENES_DIR = path.join(__dirname, '../data/mock-scenes');
const IMAGES_DIR = path.join(__dirname, '../mock-images');
const GEN_SCRIPT = path.join(__dirname, 'gen-preview.py');

let imageIndex = 0;

app.get('/api/scene/list', (_req, res) => {
    fs.mkdirSync(SCENES_DIR, { recursive: true });
    res.json(fs.readdirSync(SCENES_DIR));
});

app.post('/api/scene/add', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    fs.mkdirSync(`${SCENES_DIR}/${name}/preview`, { recursive: true });
    res.json({ ok: true });
});

const PRESETS_FILE = path.join(__dirname, '../data/presets.json');

function readAllPresets() {
    return fs.existsSync(PRESETS_FILE)
        ? JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'))
        : {};
}

app.get('/api/presets/:section', (req, res) => {
    const data = readAllPresets();
    res.json(data[req.params.section] ?? { default: null, presets: [] });
});

app.post('/api/presets/:section', (req, res) => {
    fs.mkdirSync(path.dirname(PRESETS_FILE), { recursive: true });
    const data = readAllPresets();
    data[req.params.section] = req.body;
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(data, null, 2));
    res.json({ ok: true });
});

app.get('/api/capture/preview', (_req, res) => {
    // Cycle through images in mock-images/ if present
    if (fs.existsSync(IMAGES_DIR)) {
        const images = fs.readdirSync(IMAGES_DIR).filter(f => /\.(jpg|jpeg)$/i.test(f)).sort();
        if (images.length > 0) {
            const file = images[imageIndex % images.length];
            imageIndex++;
            const data = fs.readFileSync(path.join(IMAGES_DIR, file));
            return res.json({ binary: data.toString('base64') });
        }
    }
    // Fallback: generate a synthetic star field via Python
    const b64 = execSync(`python3 "${GEN_SCRIPT}"`, { maxBuffer: 1024 * 1024 * 10 }).toString().trim();
    res.json({ binary: b64 });
});

app.get('/api/video/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const fps = Number(req.query.fps ?? 5);
    let idx = 0;

    const images = fs.existsSync(IMAGES_DIR)
        ? fs.readdirSync(IMAGES_DIR).filter(f => /\.(jpg|jpeg)$/i.test(f)).sort()
        : [];

    const interval = setInterval(() => {
        if (images.length === 0) return;
        const data = fs.readFileSync(path.join(IMAGES_DIR, images[idx % images.length]));
        idx++;
        res.write(`data: ${data.toString('base64')}\n\n`);
    }, Math.round(1000 / fps));

    req.on('close', () => clearInterval(interval));
});

app.get('/api/capture/capture', (_req, res) => {
    res.json({ ok: true });
});

// --- Mock automation ---
const STEP_ORDER = ['lights', 'darks', 'flats', 'bias'];
const STEP_MESSAGES = {
    lights: 'Ready to capture lights. Ensure the camera is pointed at the target, then click Start.',
    darks:  'Lights complete. Put the lens cap on to block all light, then click Start.',
    flats:  'Darks complete. Remove the lens cap and point the camera at a uniform light source, then click Start.',
    bias:   'Flats complete. Keep the flat light source setup — biases use minimum exposure. Click Start.',
    done:   'All frames captured successfully.',
};

let mockSession = null;
let mockPauseResolve = null;
let mockNextStepResolve = null;
let mockSkipStep = false;
const mockSseClients = [];

function mockBroadcast(data) {
    mockSseClients.forEach(res => res.write(`data: ${JSON.stringify(data)}\n\n`));
}

app.get('/api/automation/status', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    mockSseClients.push(res);
    if (mockSession) res.write(`data: ${JSON.stringify(mockSession)}\n\n`);
    req.on('close', () => {
        const idx = mockSseClients.indexOf(res);
        if (idx !== -1) mockSseClients.splice(idx, 1);
    });
});

app.post('/api/automation/start', (req, res) => {
    const { scene, lights, darks, flats, bias } = req.body;
    const outputDir = path.join(SCENES_DIR, scene);
    STEP_ORDER.forEach(dir => fs.mkdirSync(path.join(outputDir, dir), { recursive: true }));
    function countImages(step) {
        return fs.readdirSync(path.join(outputDir, step)).filter(f => /\.dng$/i.test(f)).length;
    }
    const firstStep = STEP_ORDER.find(s => ({ lights, darks, flats, bias })[s]?.count > 0) ?? 'lights';
    mockSession = {
        state: 'waiting_next_step',
        currentStep: firstStep,
        scene,
        message: STEP_MESSAGES[firstStep] ?? `Ready to capture ${firstStep}. Click Start.`,
        outputDir,
        steps: {
            lights: { count: lights.count, captured: countImages('lights') },
            darks:  { count: darks.count,  captured: countImages('darks')  },
            flats:  { count: flats.count,  captured: countImages('flats')  },
            bias:   { count: bias.count,   captured: countImages('bias')   },
        },
    };
    mockBroadcast(mockSession);
    res.json({ ok: true, outputDir: mockSession.outputDir });
});

app.post('/api/automation/stop', (_req, res) => {
    if (mockSession) { mockSession.state = 'paused'; mockBroadcast(mockSession); }
    res.json({ ok: true });
});

app.post('/api/automation/resume', (_req, res) => {
    if (mockSession) {
        mockSession.state = 'running'; mockBroadcast(mockSession);
        if (mockPauseResolve) { mockPauseResolve(); mockPauseResolve = null; }
    }
    res.json({ ok: true });
});

app.post('/api/automation/next-step', (_req, res) => {
    if (!mockSession) return res.json({ ok: true });
    const nextStep = STEP_ORDER.slice(STEP_ORDER.indexOf(mockSession.currentStep) + 1).find(s => mockSession.steps[s].count > 0);
    if (mockSession.state === 'paused') {
        mockSkipStep = true;
        mockSession.state = 'running';
        mockBroadcast(mockSession);
        if (mockPauseResolve) { mockPauseResolve(); mockPauseResolve = null; }
    } else {
        if (mockNextStepResolve) {
            mockNextStepResolve(); mockNextStepResolve = null;
        } else {
            mockSession.state = 'running';
            mockSession.message = '';
            mockBroadcast(mockSession);
            mockRunCapture().catch(console.error);
        }
    }
    res.json({ ok: true });
});

function mockDelay(ms) { return new Promise(r => setTimeout(r, ms)); }
function mockWaitResume() { return new Promise(r => { mockPauseResolve = r; }); }
function mockWaitNextStep() { return new Promise(r => { mockNextStepResolve = r; }); }

async function mockRunCapture() {
    for (const step of STEP_ORDER) {
        if (!mockSession) break;
        const stepData = mockSession.steps[step];
        if (stepData.count === 0 || stepData.captured >= stepData.count) continue;
        mockSession.currentStep = step;
        mockSession.message = '';
        mockBroadcast(mockSession);

        for (let i = stepData.captured; i < stepData.count; i++) {
            while (mockSession?.state === 'paused') await mockWaitResume();
            if (mockSkipStep) { mockSkipStep = false; break; }
            if (!mockSession) return;
            mockSession.state = 'running';
            mockBroadcast(mockSession);
            await mockDelay(400); // simulate capture
            stepData.captured++;
            mockBroadcast(mockSession);
        }

        const nextStep = STEP_ORDER.slice(STEP_ORDER.indexOf(step) + 1).find(s => mockSession.steps[s].count > 0);
        if (nextStep) {
            mockSession.currentStep = nextStep;
            mockSession.state = 'waiting_next_step';
            mockSession.message = STEP_MESSAGES[nextStep];
            mockBroadcast(mockSession);
            await mockWaitNextStep();
            mockSession.message = '';
        }
    }
    if (mockSession) {
        mockSession.state = 'done';
        mockSession.message = STEP_MESSAGES.done;
        mockBroadcast(mockSession);
    }
}

app.post('/api/automation/restart', (_req, res) => {
    if (!mockSession) return res.status(400).json({ error: 'No session' });
    const firstIncomplete = STEP_ORDER.find(s => mockSession.steps[s].count > 0 && mockSession.steps[s].captured < mockSession.steps[s].count);
    if (!firstIncomplete) return res.status(400).json({ error: 'All steps complete' });
    mockSession.currentStep = firstIncomplete;
    mockSession.state = 'waiting_next_step';
    mockSession.message = STEP_MESSAGES[firstIncomplete] ?? `Ready to capture ${firstIncomplete}. Click Start.`;
    mockBroadcast(mockSession);
    res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Mock API on http://localhost:${PORT}`));
