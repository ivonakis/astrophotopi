import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

function SceneBrowser({ setScene }) {
    const [scenes, setScenes] = useState([]);
    const [newSceneName, setNewSceneName] = useState("");
    useEffect(() => {
        fetch('/api/scene/list').then(response => response.json()).then(data => {
            setScenes(data);
        });
    } , []);
    const handleNewSceneSubmission = (event) => {
        event.preventDefault();
        setScenes([...scenes, newSceneName]);
        fetch('/api/scene/add', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: newSceneName })
        }).then(response => console.log(response.json()));
    };
    const handleSceneSelect = (event) => {
        event.preventDefault();
        console.log({event});
        setScene(event.target.id);
    }
    return (
        <div className="p-4 flex flex-col gap-4" >
            <form onSubmit={handleNewSceneSubmission} className="flex gap-4">
                <Input
                    className="flex-1"
                    type="text"
                    placeholder="New scene name..."
                    value={newSceneName}
                    onChange={(e) => setNewSceneName(e.target.value)}
                />
                <Button type="submit" variant="outline" className="flex-none">Create</Button>
            </form>
            {scenes.length > 0 &&
                <ul>
                    {scenes.map((scene) => (
                        <li key={scene}>
                            <Button id={scene} onClick={handleSceneSelect} variant="outline">{scene}</Button>
                        </li>
                    ))}
                </ul>
            }
            {scenes.length == 0 &&
                <p>There are no scenes. Start by creating a new scene.</p>
            }
        </div>
    );
}

SceneBrowser.propTypes = {
    setScene: PropTypes.func.isRequired,
};

export default SceneBrowser;
