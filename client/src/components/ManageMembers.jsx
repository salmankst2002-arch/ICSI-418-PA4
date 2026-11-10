import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API = (import.meta.env.VITE_API_URL || "http://localhost:9000").replace(/\/$/, "");

export default function ManageMembers() {
  const { projectId } = useParams();

  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const currentMemberIds = new Set(members.map(member => member.user_id));
  const availableUsers = users.filter(user => !currentMemberIds.has(user._id));

  async function loadMembers() {
    const response = await fetch(
      `${API}/projects/${projectId}/members`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load members.");
    }

    setMembers(data);
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [usersResponse, membersResponse] = await Promise.all([
          fetch(`${API}/users`),
          fetch(`${API}/projects/${projectId}/members`)
        ]);

        const usersData = await usersResponse.json();
        const membersData = await membersResponse.json();

        if (!usersResponse.ok || !membersResponse.ok) {
          throw new Error("Unable to load project information.");
        }

        setUsers(usersData);
        setMembers(membersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  async function addMember(event) {
    event.preventDefault();
    if (!selectedUser || busy) return;

    setMessage("");
    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        `${API}/projects/${projectId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: selectedUser })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add member.");
      }

      await loadMembers();
      setSelectedUser("");
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId) {
    setMessage("");
    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        `${API}/projects/${projectId}/members/${userId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to remove member.");
      }

      await loadMembers();
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="loading-state">Loading project members...</p>;

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
        <Link className="text-link" to="/projects">← All projects</Link>
        <div className="page-heading" style={{ marginTop: 25 }}>
          <div>
            <p className="eyebrow">Workspace / Team</p>
            <h1>Project members</h1>
          </div>
        </div>

        {message && <p className="notice" role="status">{message}</p>}
        {error && <p className="notice notice-error" role="alert">{error}</p>}

        <div className="member-toolbar">
          <h2>Current members</h2>
          <span className="member-count">{members.length} {members.length === 1 ? "person" : "people"}</span>
        </div>

        {members.length === 0 ? (
          <p className="empty-state">No members found.</p>
        ) : (
          <div className="member-list">
            {members.map(member => (
              <div className="member-row" key={member._id}>
                <div className="member-person">
                  <span className="member-avatar" aria-hidden="true">{member.username?.charAt(0) || "?"}</span>
                  <span className="member-name">{member.username}</span>
                  {member.isLead && <span className="lead-tag">Project lead</span>}
                </div>
                {!member.isLead && (
                  <button
                    className="button-remove"
                    type="button"
                    disabled={busy}
                    onClick={() => removeMember(member.user_id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="member-toolbar">
          <h2>Add a member</h2>
        </div>
        {availableUsers.length === 0 ? (
          <p className="empty-state">All registered users are already on this project.</p>
        ) : (
          <form className="member-form" onSubmit={addMember}>
            <select
              aria-label="Select a registered user"
              value={selectedUser}
              onChange={event => setSelectedUser(event.target.value)}
              required
            >
              <option value="">Select a registered user</option>
              {availableUsers.map(user => (
                <option key={user._id} value={user._id}>{user.username}</option>
              ))}
            </select>

            <button className="button-primary" type="submit" disabled={busy || !selectedUser}>
              {busy ? "Please wait..." : "Add member"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}