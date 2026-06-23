import express from 'express';
import fs from 'fs';
const router = express.Router();
const PRESETS_FILE = './data/presets.json';

router.get('/', (_req, res) => {
    if (!fs.existsSync(PRESETS_FILE)) return res.json({ default: null, presets: [] });
    res.json(JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8')));
});

router.post('/', (req, res) => {
    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
});

export default router;
