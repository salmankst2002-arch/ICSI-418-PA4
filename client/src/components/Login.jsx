import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:9000").replace(/\/$/, "");

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate("/projects");
      } else {
        setMessage(data.message || "Login failed.");
      }
    } catch (error) {
      setMessage("Login failed. Please try again.");
      console.error(error);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="brand-lockup"><span className="brand-mark">P</span> Project Fieldnotes</div>
        <div className="auth-aside-copy">
          <p className="eyebrow">Make good work visible</p>
          <h1>Build something worth finishing.</h1>
          <p>A calmer space to organize projects, people, and the work between them.</p>
        </div>
        <div className="auth-aside-foot">PROJECT FIELDNOTES / 2026</div>
      </aside>
      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <p className="eyebrow">Welcome back</p>
          <h2>Log in to your workspace</h2>
          <p className="auth-intro">Pick up where your team left off.</p>

          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button type="submit">Log in</button>
          {message && <p className={`notice ${message.toLowerCase().includes("fail") ? "notice-error" : ""}`} role="status">{message}</p>}

          <p className="auth-switch">
            Don’t have an account? <Link to="/">Create one</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
