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

app.get('/api/capture/preview', (req, res) => {
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

app.get('/api/capture/capture', (_req, res) => {
    res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Mock API on http://localhost:${PORT}`));
