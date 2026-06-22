import { useState } from "react";
import ProjectBrowser from "./components/projectBrowser/ProjectBrowser";
import Project from "./components/project/Project";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "/vite.svg";
import "./App.css";

function App() {
    const [project, setProject] = useState("");

    return (
        <>
            {!project && <ProjectBrowser setProject={setProject} />}
            {project && <Project project={project} setProject={setProject}/>}
        </>
    );
}

export default App;
