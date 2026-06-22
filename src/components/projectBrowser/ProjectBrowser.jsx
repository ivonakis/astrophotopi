import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

function ProjectBrowser({ setProject }) {
    const [projects, setProjects] = useState([]);
    const [newProjectName, setNewProjectName] = useState("");
    useEffect(() => {
        fetch('/api/project/list').then(response => response.json()).then(data => {
            setProjects(data);
        });
    } , []);
    const handleNewProjectSubmition = (event) => {
        event.preventDefault();
        setProjects([...projects, newProjectName]);
        fetch('/api/project/add', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: newProjectName })
        }).then(response => console.log(response.json()));
    };
    const handleProjectSelect = (event) => {
        event.preventDefault();
        console.log({event});
        setProject(event.target.id);
    }
    return (
        <div className="p-4 flex flex-col gap-4" >
            <form onSubmit={handleNewProjectSubmition} className="flex gap-4">
                <Input
                    className="flex-1"
                    type="text"
                    placeholder="New project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                />
                <Button type="submit" variant="outline" className="flex-none">Create</Button>
            </form>
            {projects.length > 0 &&
                <ul>
                    {projects.map((project) => (
                        <li key={project}>
                            <Button id={project} onClick={handleProjectSelect} variant="outline">{project}</Button>
                        </li>
                    ))}
                </ul>
            }
            {projects.length == 0 &&
                <p>There are no projects. Start by creating new project</p>
            }
        </div>
    );
}

ProjectBrowser.propTypes = {
    setProject: PropTypes.func.isRequired,
};

export default ProjectBrowser;
