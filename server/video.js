import express from 'express';
import { spawn } from 'child_process';
const router = express.Router();

const cropArgs = {
    full: [],
    half: ['--roi', '0.25,0.25,0.5,0.5'],
    20:   ['--roi', '0.4,0.4,0.2,0.2'],
    10:   ['--roi', '0.45,0.45,0.1,0.1'],
};

function findMarker(buf, b1, b2, from = 0) {
    for (let i = from; i < buf.length - 1; i++) {
        if (buf[i] === b1 && buf[i + 1] === b2) return i;
    }
    return -1;
}

router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const crop = req.query.crop ?? 'full';

    const args = [
        '-n', '--codec', 'mjpeg',
        '--width', '640', '--height', '480',
        '--framerate', '5',
        '--timeout', '0',
        '--output', '-',
        ...(cropArgs[crop] ?? []),
    ];

    const proc = spawn('rpicam-vid', args);
    let buffer = Buffer.alloc(0);

    proc.stdout.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (true) {
            const start = findMarker(buffer, 0xFF, 0xD8);
            if (start === -1) { buffer = Buffer.alloc(0); break; }
            const end = findMarker(buffer, 0xFF, 0xD9, start + 2);
            if (end === -1) break;
            res.write(`data: ${buffer.slice(start, end + 2).toString('base64')}\n\n`);
            buffer = buffer.slice(end + 2);
        }
    });

    proc.stderr.on('data', d => console.error('rpicam-vid:', d.toString()));
    proc.on('exit', () => res.end());
    req.on('close', () => proc.kill());
});

export default router;
