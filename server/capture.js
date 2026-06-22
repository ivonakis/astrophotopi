import express from 'express';
// import { Buffer } from 'node:buffer';
const router = express.Router();
import {execSync} from 'child_process';
// import fs from "fs";
// import { stdout } from 'process';
// const PROJECT_DIR = './dist/projects';
// const btoa = function (str) {
//     return Buffer.from(str, 'binary').toString('base64');
// };

router.get('/preview', (req, res) => {
    
    // const parent = fs.readdirSync('./dist');
    // if (!parent.includes('projects')) {
    //     fs.mkdir(PROJECT_DIR, (err) => {
    //         if (err) throw err;
    //     });
    //     console.log('Directory created successfully!');
    // }
    // const files = fs.readdirSync(PROJECT_DIR);
    // res.json(files);
    console.log(req.query.command);

    const stdout = execSync(req.query.command, {
        maxBuffer: 1024 * 1024 * 10
    });
    console.log('stdout:', stdout.toString());
    res.json({binary: stdout.toString()});
    console.log("Finish");
});

router.get('/capture', (req, res) => {
    
    // const parent = fs.readdirSync('./dist');
    // if (!parent.includes('projects')) {
    //     fs.mkdir(PROJECT_DIR, (err) => {
    //         if (err) throw err;
    //     });
    //     console.log('Directory created successfully!');
    // }
    // const files = fs.readdirSync(PROJECT_DIR);
    // res.json(files);
    console.log(req.query.command);

    const stdout = execSync(req.query.command, {
        maxBuffer: 1024 * 1024 * 10
    });
    console.log('stdout:', stdout.toString());
    res.json({ok: true});
    console.log("Capture");
});

export default router;