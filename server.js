//e.g server.js
import express from "express";
import scene from "./server/scene.js";
import capture from "./server/capture.js";
import presets from "./server/presets.js";
import video from "./server/video.js";
import automation from "./server/automation.js";
//import ViteExpress from "vite-express";


const app = express();
app.use(express.json());
app.use(express.static('dist'));
app.get("/message", (_, res) => res.send("Hello from express!"));
app.use("/api/scene", scene);
app.use("/api/capture", capture);
app.use("/api/presets", presets);
app.use("/api/video", video);
app.use("/api/automation", automation);
app.listen(3000, () => {console.log("Server is listening on port 3000")});
//ViteExpress.listen(app, 3000, () => console.log("Server is listening..."));