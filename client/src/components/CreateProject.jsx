import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:9000").replace(/\/$/, "");

function CreateProject() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "Planning",
    project_lead_id: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error("Could not load users.");

        const data = await response.json();
        setUsers(data);
      } catch (error) {
        setMessage(error.message);
      }
    }

    loadUsers();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm(previous => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Project creation failed.");
      }

      setMessage("Project created successfully!");
      setForm({
        name: "",
        description: "",
        status: "Planning",
        project_lead_id: ""
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="workspace-header">
        <Link className="brand-link" to="/projects"><span className="brand-mark">P</span> Project Fieldnotes</Link>
        <nav className="workspace-nav" aria-label="Main navigation">
          <Link to="/projects">Projects</Link>
          <Link to="/create-project" aria-current="page">New project</Link>
          <Link to="/login">Sign in</Link>
        </nav>
      </header>
      <main className="form-layout">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Workspace / Projects</p>
            <h1>Create a project</h1>
          </div>
        </div>

        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="project-name">Project name</label>
            <input id="project-name" name="name" value={form.name} onChange={handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="project-description">Description</label>
            <textarea id="project-description" name="description" value={form.description} onChange={handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="project-status">Status</label>
            <select id="project-status" name="status" value={form.status} onChange={handleChange}>
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="project-lead">Project lead</label>
            <select id="project-lead" name="project_lead_id" value={form.project_lead_id} onChange={handleChange} required>
              <option value="">Select a registered user</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>{user.username}</option>
              ))}
            </select>
          </div>

          {message && <p className="notice" role="status">{message}</p>}
          <div className="form-actions">
            <button className="button-primary" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create project"}
            </button>
            <Link className="text-link" to="/projects">Cancel</Link>
          </div>
        </form>
      </main>
    </>
  );
}

export default CreateProject;
