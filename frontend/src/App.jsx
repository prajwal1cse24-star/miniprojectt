import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const emptyAnimal = { name: "", type: "", age: "" };
const emptyFeeder = {
  location: "",
  status: "Active",
  feedLevel: "80",
  batteryLevel: "90",
  networkStatus: "Online",
  schedule: "Morning / Evening",
  feedQuantity: "15",
};
const emptyFeedLog = { animalId: "", feederId: "", quantity: "" };
const emptyAuth = { name: "", email: "", password: "" };

const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const requestJson = async (url, options = {}) => {
  const tokenLocal = localStorage.getItem("authToken");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {}),
  };

  const response = await fetch(url, { ...options, headers });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Request failed with ${response.status}`);
  }

  return payload;
};

const sameDay = (left, right) => {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("authToken") || "");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("authUser") || "null");
    } catch {
      return null;
    }
  });
  const [animals, setAnimals] = useState([]);
  const [feeders, setFeeders] = useState([]);
  const [feedLogs, setFeedLogs] = useState([]);
  const [animalForm, setAnimalForm] = useState(emptyAnimal);
  const [feederForm, setFeederForm] = useState(emptyFeeder);
  const [feedLogForm, setFeedLogForm] = useState(emptyFeedLog);
  const [authForm, setAuthForm] = useState(emptyAuth);
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [dashboardMessage, setDashboardMessage] = useState("Loading farm data...");
  const [authMessage, setAuthMessage] = useState("");
  const [savingAnimal, setSavingAnimal] = useState(false);
  const [savingFeeder, setSavingFeeder] = useState(false);
  const [savingFeedLog, setSavingFeedLog] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const isAuthenticated = Boolean(token);

  const loadData = async () => {
    setLoading(true);

    try {
      const [animalsData, feedersData, feedLogsData] = await Promise.all([
        requestJson("/api/animals"),
        requestJson("/api/feeders"),
        requestJson("/api/feeds"),
      ]);

      setAnimals(animalsData);
      setFeeders(feedersData);
      setFeedLogs(feedLogsData);
      setDashboardMessage(
        feedLogsData.length || feedersData.length || animalsData.length
          ? "Farm data is synced with MongoDB."
          : "No records yet. Create feeders, livestock, and feeding logs to populate the dashboard."
      );
    } catch (error) {
      setDashboardMessage(`Unable to load farm data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const animalsById = useMemo(() => {
    return new Map(animals.map((animal) => [String(animal._id), animal]));
  }, [animals]);

  const activeFeeders = feeders.filter((feeder) => feeder.status === "Active").length;
  const inactiveFeeders = feeders.length - activeFeeders;
  const todayFeedUsed = feedLogs
    .filter((log) => sameDay(log.date, new Date()))
    .reduce((sum, log) => sum + (Number(log.quantity) || 0), 0);

  const weeklyUsage = weekLabels.map((label, index) => {
    const dayLogs = feedLogs.filter((log) => {
      const date = new Date(log.date);
      return date.getDay() === ((index + 1) % 7);
    });

    return {
      label,
      value: dayLogs.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0),
    };
  });

  const maxWeeklyUsage = Math.max(...weeklyUsage.map((entry) => entry.value), 1);
  const alerts = [
    ...feeders
      .filter((feeder) => Number(feeder.feedLevel) < 30)
      .map((feeder) => ({
        type: "Low feed level",
        detail: `${feeder.location || "Unknown feeder"} is below 30%`,
        tone: "warning",
      })),
    ...feeders
      .filter((feeder) => feeder.status === "Offline")
      .map((feeder) => ({
        type: "Feeder offline",
        detail: `${feeder.location || "Unknown feeder"} is offline`,
        tone: "danger",
      })),
    ...feedLogs
      .filter((log) => Number(log.quantity) > 35)
      .map((log) => ({
        type: "High feed usage",
        detail: `${log.animal?.name || "Animal"} consumed ${log.quantity} units`,
        tone: "info",
      })),
  ];

  const systemHealthCards = feeders.map((feeder, index) => ({
    id: feeder._id,
    label: feeder.location || `Feeder ${index + 1}`,
    sensor: feeder.status === "Active" ? "Healthy" : "Attention needed",
    battery: feeder.batteryLevel ?? 85,
    network: feeder.networkStatus || (feeder.status === "Active" ? "Online" : "Offline"),
  }));

  const monthlyFeedCost = Math.round(feedLogs.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0) * 2.4);
  const performanceScore = Math.max(68, 96 - alerts.length * 4);

  const handleAnimalChange = (event) => {
    const { name, value } = event.target;
    setAnimalForm((current) => ({ ...current, [name]: value }));
  };

  const handleFeederChange = (event) => {
    const { name, value } = event.target;
    setFeederForm((current) => ({ ...current, [name]: value }));
  };

  const handleFeedLogChange = (event) => {
    const { name, value } = event.target;
    setFeedLogForm((current) => ({ ...current, [name]: value }));
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  };

  const createAnimal = async (event) => {
    event.preventDefault();
    setSavingAnimal(true);

    try {
      await requestJson("/api/animals", {
        method: "POST",
        body: JSON.stringify({
          name: animalForm.name.trim(),
          type: animalForm.type.trim(),
          age: animalForm.age === "" ? null : Number(animalForm.age),
        }),
      });

      setAnimalForm(emptyAnimal);
      await loadData();
    } catch (error) {
      setDashboardMessage(`Unable to save animal: ${error.message}`);
    } finally {
      setSavingAnimal(false);
    }
  };

  const createFeeder = async (event) => {
    event.preventDefault();
    setSavingFeeder(true);

    try {
      await requestJson("/api/feeders", {
        method: "POST",
        body: JSON.stringify({
          location: feederForm.location.trim(),
          status: feederForm.status,
          feedLevel: feederForm.feedLevel === "" ? null : Number(feederForm.feedLevel),
          batteryLevel: feederForm.batteryLevel === "" ? null : Number(feederForm.batteryLevel),
          networkStatus: feederForm.networkStatus,
          schedule: feederForm.schedule.trim(),
          feedQuantity: feederForm.feedQuantity === "" ? null : Number(feederForm.feedQuantity),
        }),
      });

      setFeederForm(emptyFeeder);
      await loadData();
    } catch (error) {
      setDashboardMessage(`Unable to save feeder: ${error.message}`);
    } finally {
      setSavingFeeder(false);
    }
  };

  const createFeedLog = async (event) => {
    event.preventDefault();
    setSavingFeedLog(true);

    try {
      await requestJson("/api/feeds", {
        method: "POST",
        body: JSON.stringify({
          animal: feedLogForm.animalId,
          feeder: feedLogForm.feederId,
          quantity: Number(feedLogForm.quantity),
        }),
      });

      setFeedLogForm(emptyFeedLog);
      await loadData();
    } catch (error) {
      setDashboardMessage(`Unable to save feeding record: ${error.message}`);
    } finally {
      setSavingFeedLog(false);
    }
  };

  const updateFeederStatus = async (feeder, status) => {
    try {
      await requestJson(`/api/feeders/${feeder._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          feedLevel: status === "Active" ? Math.min(100, Number(feeder.feedLevel || 0) + 6) : feeder.feedLevel,
        }),
      });

      await loadData();
    } catch (error) {
      setDashboardMessage(`Unable to update feeder: ${error.message}`);
    }
  };

  const navigate = useNavigate();

  const submitAuth = async (event) => {
    event.preventDefault();
    setSavingAuth(true);

    try {
      const route = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        authMode === "register"
          ? {
              name: authForm.name.trim(),
              email: authForm.email.trim(),
              password: authForm.password,
            }
          : {
              email: authForm.email.trim(),
              password: authForm.password,
            };

      const response = await requestJson(route, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setToken(response.token);
      setCurrentUser(response.user || null);
      localStorage.setItem("authToken", response.token);
      localStorage.setItem("authUser", JSON.stringify(response.user || null));
      setAuthMessage(
        authMode === "register"
          ? `Registered ${response.user?.name || authForm.name}.`
          : `Logged in as ${response.user?.name || authForm.email}.`
      );
      setAuthForm(emptyAuth);
      // navigate to dashboard after successful login/register
      try {
        navigate("/", { replace: true });
      } catch {}
    } catch (error) {
      setAuthMessage(`Authentication failed: ${error.message}`);
    } finally {
      setSavingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setToken("");
    setCurrentUser(null);
    setAuthMessage("");
    setAuthMode("login");
    setAuthForm(emptyAuth);
  };
  
  const handleLogoutAndRedirect = () => {
    handleLogout();
    navigate("/login", { replace: true });
  };

  const AuthView = () => (
    <main className="auth-screen">
      <section className="auth-hero">
        <p className="eyebrow">Animal Feeder App</p>
        <h1>Sign in to manage the farm dashboard</h1>
        <p className="lede">Register a new account or log in to open livestock monitoring, feeder control, reports, and alerts.</p>
      </section>

      <section className="panel auth-panel">
        <div className="panel-header">
          <div>
            <h2>{authMode === "register" ? "Create account" : "Login"}</h2>
            <p className="section-note">Use your farm admin credentials to continue.</p>
          </div>
          <div className="toggle-row">
            <button type="button" className={authMode === "login" ? "toggle-button active" : "toggle-button"} onClick={() => setAuthMode("login")}>
              Login
            </button>
            <button type="button" className={authMode === "register" ? "toggle-button active" : "toggle-button"} onClick={() => setAuthMode("register")}>
              Register
            </button>
          </div>
        </div>

        <form className="auth-form auth-panel-form" onSubmit={submitAuth}>
          {authMode === "register" ? (
            <label>
              Name
              <input name="name" value={authForm.name} onChange={handleAuthChange} placeholder="Admin" required />
            </label>
          ) : null}
          <label>
            Email
            <input name="email" type="email" value={authForm.email} onChange={handleAuthChange} placeholder="user@farm.com" required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={authForm.password} onChange={handleAuthChange} placeholder="••••••••" required />
          </label>
          <button type="submit" disabled={savingAuth}>
            {savingAuth ? "Processing..." : authMode === "register" ? "Create account" : "Login"}
          </button>
        </form>

        {authMessage ? <p className="status">{authMessage}</p> : null}
      </section>
    </main>
  );

  const DashboardView = () => (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Smart Farm Operations</p>
        <h1>Livestock, feeders, alerts, and analytics in one dashboard</h1>
        <p className="lede">
          Monitor daily farm activity, control feeders, review reports, and manage users from a single screen.
        </p>
        <div className="hero-actions">
          <div className="account-pill">
            Signed in as {currentUser?.name || currentUser?.email || "farm admin"}
          </div>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>1. Overview Panel</h2>
            <p className="section-note">Quick snapshot of farm operations for fast decisions.</p>
          </div>
          <button type="button" className="ghost-button" onClick={loadData}>
            Refresh dashboard
          </button>
        </div>

        <div className="metric-grid">
          <article className="metric-card">
            <span>Total livestock</span>
            <strong>{animals.length}</strong>
            <small>Animals registered in the system</small>
          </article>
          <article className="metric-card">
            <span>Feed used today</span>
            <strong>{todayFeedUsed} kg</strong>
            <small>Sum of today's feed logs</small>
          </article>
          <article className="metric-card">
            <span>Active feeders</span>
            <strong>{activeFeeders}</strong>
            <small>{inactiveFeeders} offline or inactive</small>
          </article>
          <article className="metric-card">
            <span>Alerts</span>
            <strong>{alerts.length}</strong>
            <small>Low feed, offline, and usage warnings</small>
          </article>
        </div>

        <p className="status">{dashboardMessage}</p>
        {loading ? <p className="status">Loading records...</p> : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>2. Real-Time Feeder Monitoring</h2>
            <p className="section-note">Status, feed level, battery, and last update per feeder.</p>
          </div>
        </div>

        <div className="feeder-grid">
          {feeders.length === 0 ? (
            <p className="status">No feeders yet. Add one in the control panel.</p>
          ) : (
            feeders.map((feeder) => (
              <article key={feeder._id} className="feeder-card">
                <div className="feeder-top">
                  <strong>{feeder.location || "Unnamed feeder"}</strong>
                  <span className={`badge ${feeder.status === "Active" ? "badge-on" : "badge-off"}`}>
                    {feeder.status || "Unknown"}
                  </span>
                </div>
                <p>Feed level: {feeder.feedLevel ?? 0}%</p>
                <p>Battery: {feeder.batteryLevel ?? 0}%</p>
                <p>Network: {feeder.networkStatus || "Unknown"}</p>
                <p>Last updated: {feeder.lastUpdated ? formatDateTime.format(new Date(feeder.lastUpdated)) : "Now"}</p>
                <p>Schedule: {feeder.schedule || "Not set"}</p>
                <p>Quantity: {feeder.feedQuantity ?? 0} kg</p>
                <div className="button-row">
                  <button type="button" onClick={() => updateFeederStatus(feeder, "Active")}>
                    Start
                  </button>
                  <button type="button" className="secondary-button" onClick={() => updateFeederStatus(feeder, "Offline")}>
                    Stop
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>3. Feed Consumption Graph</h2>
            <p className="section-note">Daily feed usage trends based on logged feeding records.</p>
          </div>
        </div>

        <div className="chart-card">
          {weeklyUsage.map((entry) => (
            <div key={entry.label} className="chart-bar-wrap">
              <div className="chart-bar-label">{entry.label}</div>
              <div className="chart-track">
                <div className="chart-fill" style={{ width: `${(entry.value / maxWeeklyUsage) * 100}%` }} />
              </div>
              <div className="chart-value">{entry.value} kg</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>4. Livestock Feeding Records</h2>
            <p className="section-note">Animal ID, feed intake history, and feeding schedule tracking.</p>
          </div>
        </div>

        <form className="record-form" onSubmit={createFeedLog}>
          <label>
            Animal
            <select name="animalId" value={feedLogForm.animalId} onChange={handleFeedLogChange} required>
              <option value="">Select animal</option>
              {animals.map((animal) => (
                <option key={animal._id} value={animal._id}>
                  {animal.name || animal._id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Feeder
            <select name="feederId" value={feedLogForm.feederId} onChange={handleFeedLogChange} required>
              <option value="">Select feeder</option>
              {feeders.map((feeder) => (
                <option key={feeder._id} value={feeder._id}>
                  {feeder.location || feeder._id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Feed intake
            <input
              name="quantity"
              type="number"
              min="0"
              value={feedLogForm.quantity}
              onChange={handleFeedLogChange}
              placeholder="12"
              required
            />
          </label>
          <button type="submit" disabled={savingFeedLog}>
            {savingFeedLog ? "Logging..." : "Add feeding record"}
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Animal</th>
                <th>Feeder</th>
                <th>Feed intake</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {feedLogs.length === 0 ? (
                <tr>
                  <td colSpan="4">No feeding records yet.</td>
                </tr>
              ) : (
                feedLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{log.animal?.name || animalsById.get(String(log.animal))?.name || "Unknown"}</td>
                    <td>{log.feeder?.location || "Unknown"}</td>
                    <td>{log.quantity} kg</td>
                    <td>{log.date ? formatDateTime.format(new Date(log.date)) : "Now"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>5. Alerts & Notifications</h2>
            <p className="section-note">Low feed, missed feeder updates, and system warnings.</p>
          </div>
        </div>

        <div className="alert-grid">
          {alerts.length === 0 ? (
            <p className="status">No active alerts.</p>
          ) : (
            alerts.slice(0, 6).map((alert, index) => (
              <article key={`${alert.type}-${index}`} className={`alert-card alert-${alert.tone}`}>
                <strong>{alert.type}</strong>
                <p>{alert.detail}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>6. Control Panel</h2>
            <p className="section-note">Start/stop feeders, set schedule, and adjust feed quantity.</p>
          </div>
        </div>

        <form className="control-form" onSubmit={createFeeder}>
          <label>
            Feeder location
            <input
              name="location"
              value={feederForm.location}
              onChange={handleFeederChange}
              placeholder="Barn 1"
              required
            />
          </label>
          <label>
            Status
            <select name="status" value={feederForm.status} onChange={handleFeederChange}>
              <option>Active</option>
              <option>Offline</option>
            </select>
          </label>
          <label>
            Feed level %
            <input
              name="feedLevel"
              type="number"
              min="0"
              max="100"
              value={feederForm.feedLevel}
              onChange={handleFeederChange}
              required
            />
          </label>
          <label>
            Battery %
            <input
              name="batteryLevel"
              type="number"
              min="0"
              max="100"
              value={feederForm.batteryLevel}
              onChange={handleFeederChange}
              required
            />
          </label>
          <label>
            Network
            <select name="networkStatus" value={feederForm.networkStatus} onChange={handleFeederChange}>
              <option>Online</option>
              <option>Weak</option>
              <option>Offline</option>
            </select>
          </label>
          <label>
            Feeding schedule
            <input
              name="schedule"
              value={feederForm.schedule}
              onChange={handleFeederChange}
              placeholder="Morning / Evening"
              required
            />
          </label>
          <label>
            Feed quantity
            <input
              name="feedQuantity"
              type="number"
              min="0"
              value={feederForm.feedQuantity}
              onChange={handleFeederChange}
              required
            />
          </label>
          <button type="submit" disabled={savingFeeder}>
            {savingFeeder ? "Saving..." : "Save feeder settings"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>7. Reports & Analytics</h2>
            <p className="section-note">Monthly reports, cost estimation, and performance analysis.</p>
          </div>
        </div>

        <div className="metric-grid metric-grid-small">
          <article className="metric-card">
            <span>Monthly feed cost</span>
            <strong>${monthlyFeedCost}</strong>
            <small>Estimated from logged consumption</small>
          </article>
          <article className="metric-card">
            <span>Performance score</span>
            <strong>{performanceScore}%</strong>
            <small>Based on alerts and feeder health</small>
          </article>
          <article className="metric-card">
            <span>Feed logs</span>
            <strong>{feedLogs.length}</strong>
            <small>Records available for reporting</small>
          </article>
        </div>

        <div className="report-list">
          <article className="report-card">Monthly operational summary is ready for export.</article>
          <article className="report-card">Feed cost projection is based on the current intake history.</article>
          <article className="report-card">Performance analysis highlights feeder reliability and alert frequency.</article>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>9. System Health Monitoring</h2>
            <p className="section-note">Sensor status, battery levels, and network connectivity checks.</p>
          </div>
        </div>

        <div className="health-grid">
          {systemHealthCards.length === 0 ? (
            <p className="status">Add feeders to see system health data.</p>
          ) : (
            systemHealthCards.map((card) => (
              <article key={card.id} className="health-card">
                <strong>{card.label}</strong>
                <p>Sensor: {card.sensor}</p>
                <p>Battery: {card.battery}%</p>
                <p>Connectivity: {card.network}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Animal Registry</h2>
            <p className="section-note">Livestock records currently in MongoDB.</p>
          </div>
        </div>

        <form className="control-form" onSubmit={createAnimal}>
          <label>
            Name
            <input
              name="name"
              value={animalForm.name}
              onChange={handleAnimalChange}
              placeholder="Milo"
              required
            />
          </label>
          <label>
            Type
            <input
              name="type"
              value={animalForm.type}
              onChange={handleAnimalChange}
              placeholder="Cow"
              required
            />
          </label>
          <label>
            Age
            <input
              name="age"
              type="number"
              min="0"
              value={animalForm.age}
              onChange={handleAnimalChange}
              placeholder="3"
            />
          </label>
          <button type="submit" disabled={savingAnimal}>
            {savingAnimal ? "Saving..." : "Add animal"}
          </button>
        </form>

        <div className="animal-list">
          {animals.length === 0 ? (
            <p className="status">No animals yet.</p>
          ) : (
            animals.map((animal) => (
              <article key={animal._id} className="animal-card">
                <strong>{animal.name || "Unnamed"}</strong>
                <span>{animal.type || "Unknown type"}</span>
                <small>{animal.age == null ? "Age not set" : `Age ${animal.age}`}</small>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );

  // App routes: login and protected dashboard
  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <AuthView /> : <Navigate to="/" replace />} />
      <Route
        path="/"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <DashboardView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default App; // Fixed JSX structure