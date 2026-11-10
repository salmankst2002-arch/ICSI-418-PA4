
import { useEffect, useState } from "react";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");

const emptyForm = () => ({
  title: "",
  description: "",
  priority: "Medium",
  status: "To Do",
  assigned_user_id: ""
});

async function apiRequest(url, options = {}) {
  const response = await fetch(`${API_URL}${url}`, options);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

export default function ProjectBacklog() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");

  const [stories, setStories] = useState([]);
  const [members, setMembers] = useState([]);

  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load projects when the page opens.
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await apiRequest("/projects");

        setProjects(data);

        if (data.length > 0) {
          setSelectedProject(String(data[0]._id));
        }
      } catch (err) {
        setError(err.message);
      }
    }

    loadProjects();
  }, []);

  // Load only the selected project's stories and members.
  useEffect(() => {
    if (!selectedProject) return;

    let active = true;

    setStories([]);
    setMembers([]);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setMessage("");
    setLoading(true);

    async function loadData() {
      try {
        const [storyData, memberData] = await Promise.all([
          apiRequest(`/projects/${selectedProject}/stories`),
          apiRequest(`/projects/${selectedProject}/members`)
        ]);

        if (!active) return;

        setStories(storyData);
        setMembers(memberData);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [selectedProject]);

  async function refreshStories(projectId = selectedProject) {
    const data = await apiRequest(
      `/projects/${projectId}/stories`
    );

    if (projectId === selectedProject) {
      setStories(data);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm(previous => ({
      ...previous,
      [name]: value
    }));
  }

  function startEdit(story) {
    setEditingId(String(story._id));

    setForm({
      title: story.title,
      description: story.description,
      priority: story.priority,
      status: story.status,
      assigned_user_id: story.assigned_user_id
        ? String(story.assigned_user_id)
        : ""
    });

    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedProject || saving) return;

    setError("");
    setMessage("");
    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assigned_user_id: form.assigned_user_id || null
      };

      let url = `/projects/${selectedProject}/stories`;
      let method = "POST";

      if (editingId) {
        url += `/${editingId}`;
        method = "PUT";
        payload.status = form.status;
      }

      const result = await apiRequest(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      await refreshStories();

      setMessage(result.message);
      setEditingId(null);
      setForm(emptyForm());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteStory(story) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${story.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const result = await apiRequest(
        `/projects/${selectedProject}/stories/${story._id}`,
        { method: "DELETE" }
      );

      await refreshStories();

      if (editingId === String(story._id)) {
        cancelEdit();
      }

      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginTop: "6px",
    marginBottom: "14px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    boxSizing: "border-box"
  };

  const buttonStyle = {
    padding: "10px 16px",
    cursor: "pointer",
    marginRight: "8px",
    borderRadius: "6px",
    border: "1px solid #aaa"
  };

  return (
    <div
      style={{
        maxWidth: "950px",
        margin: "30px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <h1>Project Backlog</h1>

      <p>
        Create and manage user stories for your projects.
      </p>

      {error && (
        <p role="alert" style={{ color: "darkred" }}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={{ color: "green" }}>
          {message}
        </p>
      )}

      <label htmlFor="project">
        <strong>Select Project</strong>
      </label>

      <select
        id="project"
        value={selectedProject}
        onChange={event => setSelectedProject(event.target.value)}
        style={inputStyle}
      >
        {projects.length === 0 && (
          <option value="">No projects available</option>
        )}

        {projects.map(project => (
          <option
            key={String(project._id)}
            value={String(project._id)}
          >
            {project.name}
          </option>
        ))}
      </select>

      {selectedProject && (
        <>
          <hr />

          <h2>
            {editingId ? "Edit User Story" : "Create User Story"}
          </h2>

          <form onSubmit={handleSubmit}>
            <label htmlFor="story-title">
              Story Title
            </label>

            <input
              id="story-title"
              name="title"
              value={form.title}
              onChange={updateField}
              placeholder="Example: View Campus Events"
              required
              style={inputStyle}
            />

            <label htmlFor="story-description">
              Description
            </label>

            <textarea
              id="story-description"
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="As a student, I want to view events, so that I can plan my activities."
              required
              rows={4}
              style={inputStyle}
            />

            <label htmlFor="story-priority">
              Priority
            </label>

            <select
              id="story-priority"
              name="priority"
              value={form.priority}
              onChange={updateField}
              style={inputStyle}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {editingId && (
              <>
                <label htmlFor="story-status">
                  Status
                </label>

                <select
                  id="story-status"
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  style={inputStyle}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">
                    In Progress
                  </option>
                  <option value="Done">Done</option>
                </select>
              </>
            )}

            <label htmlFor="story-member">
              Assigned Member
            </label>

            <select
              id="story-member"
              name="assigned_user_id"
              value={form.assigned_user_id}
              onChange={updateField}
              style={inputStyle}
            >
              <option value="">Unassigned</option>

              {members.map(member => (
                <option
                  key={String(member.user_id)}
                  value={String(member.user_id)}
                >
                  {member.username}
                  {member.isLead ? " (Project Lead)" : ""}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={saving || loading}
              style={buttonStyle}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Story"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                style={buttonStyle}
              >
                Cancel
              </button>
            )}
          </form>

          <hr />

          <h2>Project Stories ({stories.length})</h2>

          {loading ? (
            <p>Loading backlog...</p>
          ) : stories.length === 0 ? (
            <p>No user stories have been created for this project.</p>
          ) : (
            stories.map(story => (
              <div
                key={String(story._id)}
                style={{
                  border: "1px solid #ddd",
                  padding: "18px",
                  marginBottom: "16px",
                  borderRadius: "8px"
                }}
              >
                <h3>{story.title}</h3>

                <p>{story.description}</p>

                <p>
                  <strong>Priority:</strong> {story.priority}
                </p>

                <p>
                  <strong>Status:</strong> {story.status}
                </p>

                <p>
                  <strong>Assigned To:</strong>{" "}
                  {story.assigned_user_name || "Unassigned"}
                </p>

                <button
                  type="button"
                  onClick={() => startEdit(story)}
                  style={buttonStyle}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => deleteStory(story)}
                  style={buttonStyle}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
