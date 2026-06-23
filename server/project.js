import express from 'express';
const router = express.Router()
import fs from "fs";
const PROJECT_DIR = './data/projects';

router.get('/list', (req, res) => {
    fs.mkdirSync(PROJECT_DIR, { recursive: true });
    const files = fs.readdirSync(PROJECT_DIR);
    res.json(files);
});

router.post('/add', (req, res) => {
    //Get the json posted from client
    let projectData = req.body;
    console.log('Project Data:', projectData);
    const files = fs.readdirSync(PROJECT_DIR);
    if (!files.includes(projectData.name)) {
        fs.mkdirSync(`${PROJECT_DIR}/${projectData.name}/preview`, { recursive: true });
    }
    res.json({ ok: true });
});

export default router;