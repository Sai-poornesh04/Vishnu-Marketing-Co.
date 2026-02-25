import { useState } from "react";
import { useDispatch } from "react-redux";
import { login } from "../../slice/authSlice";
import { useNavigate } from "react-router-dom";
import "./login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Enter username and password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://vishnu-marketing-co.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        setError(data?.message || "Invalid credentials");
        return;
      }

      localStorage.setItem("token", data.token);
      dispatch(login({ name: data?.user?.username || username.trim() }));
      navigate("/dashboard");
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-blobs" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <div className="login-shell">
        <div className="login-brand">
          <div className="brand-badge">VM</div>
          <div className="brand-text">
            <div className="brand-title">Welcome to Vishnu Marketing & co</div>
            <div className="brand-sub">Secure Admin Access</div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <h2>Admin Login</h2>
            <p>Use your credentials to continue</p>
          </div>

          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              autoComplete="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="pass-wrap">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error ? <div className="login-alert">{error}</div> : null}

          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}