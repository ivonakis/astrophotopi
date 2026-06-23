import { useState } from "react";
import SceneBrowser from "./components/sceneBrowser/SceneBrowser";
import Scene from "./components/scene/Scene";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "/vite.svg";
import "./App.css";

function App() {
    const [scene, setScene] = useState("");

    return (
        <>
            {!scene && <SceneBrowser setScene={setScene} />}
            {scene && <Scene scene={scene} setScene={setScene}/>}
        </>
    );
}

export default App;
