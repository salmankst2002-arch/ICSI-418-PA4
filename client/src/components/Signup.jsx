import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:9000").replace(/\/$/, "");

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: name.trim(),
          name: name.trim(),
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Signup successful.");
      } else {
        setMessage(data.message || "Signup failed.");
      }
    } catch (error) {
      setMessage("Signup failed. Please try again.");
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
          <p className="eyebrow">Get started</p>
          <h2>Create your account</h2>
          <p className="auth-intro">Set up your workspace profile.</p>

          <div className="field">
            <label htmlFor="signup-name">Full name</label>
            <input id="signup-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="signup-email">Email</label>
            <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="signup-password">Password</label>
            <input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="signup-confirm">Confirm password</label>
            <input id="signup-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          <button type="submit">Create account</button>
          {message && <p className={`notice ${message.toLowerCase().includes("fail") || message.toLowerCase().includes("match") ? "notice-error" : ""}`} role="status">{message}</p>}

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
