import express from 'express';
const router = express.Router()
import fs from "fs";
const SCENE_DIR = './data/scenes';

router.get('/list', (_req, res) => {
    fs.mkdirSync(SCENE_DIR, { recursive: true });
    const files = fs.readdirSync(SCENE_DIR);
    res.json(files);
});

router.post('/add', (req, res) => {
    let sceneData = req.body;
    console.log('Scene Data:', sceneData);
    const files = fs.readdirSync(SCENE_DIR);
    if (!files.includes(sceneData.name)) {
        fs.mkdirSync(`${SCENE_DIR}/${sceneData.name}/preview`, { recursive: true });
    }
    res.json({ ok: true });
});

export default router;
