import express from 'express';
import fs from 'fs';
const router = express.Router();
const PRESETS_FILE = './data/presets.json';

function readAll() {
    return fs.existsSync(PRESETS_FILE)
        ? JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'))
        : {};
}

router.get('/:section', (req, res) => {
    const data = readAll();
    res.json(data[req.params.section] ?? { default: null, presets: [] });
});

router.post('/:section', (req, res) => {
    fs.mkdirSync('./data', { recursive: true });
    const data = readAll();
    data[req.params.section] = req.body;
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(data, null, 2));
    res.json({ ok: true });
});

export default router;
