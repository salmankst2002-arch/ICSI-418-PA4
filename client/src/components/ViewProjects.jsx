import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:9000").replace(/\/$/, "");

function ViewProjects() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch(`${API_URL}/projects`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load projects.");
        }

        setProjects(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  if (loading) return <p className="loading-state">Loading projects...</p>;

  return (
    <>
      <header className="workspace-header">
        <Link className="brand-link" to="/projects"><span className="brand-mark">P</span> Project Fieldnotes</Link>
        <nav className="workspace-nav" aria-label="Main navigation">
          <Link to="/projects" aria-current="page">Projects</Link>
          <Link to="/create-project">New project</Link>
          <Link to="/login">Sign in</Link>
        </nav>
      </header>
      <main className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Workspace / Projects</p>
            <h1>Projects</h1>
            <p>Your team’s active work, in one place.</p>
          </div>
          <Link className="button-primary" to="/create-project">＋ New project</Link>
        </div>

        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <section className="project-list" aria-label="Projects">
          {projects.length === 0 && <p className="empty-state">No projects found.</p>}

          {projects.map(project => (
            <article className="project-row" key={project._id}>
              <div className="project-title">
                <h2>{project.name}</h2>
                <p>{project.description}</p>
              </div>
              <div className="project-cell project-status">
                <span className="project-cell-label">Status</span>
                <span className="status-tag">{project.status}</span>
              </div>
              <div className="project-cell project-lead">
                <span className="project-cell-label">Project lead</span>
                {project.project_lead_name}
              </div>
              <Link className="project-link" to={`/projects/${project._id}/members`}>
                Manage members
              </Link>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}

export default ViewProjects;