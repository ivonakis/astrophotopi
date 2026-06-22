import express from 'express';
const router = express.Router()
import fs from "fs";
const PROJECT_DIR = './dist/projects';

router.get('/list', (req, res) => {
    const parent = fs.readdirSync('./dist');
    if (!parent.includes('projects')) {
        fs.mkdir(PROJECT_DIR, (err) => {
            if (err) throw err;
        });
        console.log('Directory created successfully!');
    }
    const files = fs.readdirSync(PROJECT_DIR);
    res.json(files);
});

router.post('/add', (req, res) => {
    //Get the json posted from client
    let projectData = req.body;
    console.log('Project Data:', projectData);
    const files = fs.readdirSync(PROJECT_DIR);
    if (!files.includes(projectData.name)) {
        fs.mkdir(`${PROJECT_DIR}/${projectData.name}`, (err) => {
            if (err) {
                res.json({error: 'Error creating directory'});
                return;
            }
        });
        fs.mkdir(`${PROJECT_DIR}/${projectData.name}/preview`, (err) => {
            if (err) {
                res.json({error: 'Error creating directory'});
                return;
            }
        });
    }
    res.json({ ok: true });
});

export default router;