import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Moon,
  Plus,
  RefreshCcw,
  Settings,
  Sun,
  Syringe,
  Thermometer,
  Trash2,
  Users,
  Zap,
} from "lucide-react";

const navItems = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "livestock", label: "Herd Management", icon: Activity },
  { id: "health", label: "Health & Vet", icon: Heart },
  { id: "feeding", label: "Feed Manager", icon: Zap },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "staff", label: "User Management", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

const pageTitles = {
  overview: "Dashboard",
  livestock: "Herd Management",
  health: "Health & Vet",
  feeding: "Feed Manager",
  reports: "Reports",
  staff: "User Management",
  settings: "Settings",
};

const today = () => new Date().toISOString().slice(0, 10);

const requestJson = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(localStorage.getItem("authToken") ? { Authorization: `Bearer ${localStorage.getItem("authToken")}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with ${response.status}`);
  }

  return data;
};

const downloadCSV = (filename, rows) => {
  const csv = rows.map((row) => row.map((cell) => JSON.stringify(cell ?? "")).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  link.download = filename;
  link.click();
};

const toneForStatus = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (["healthy", "active", "done", "completed", "resolved", "adequate"].includes(normalized)) {
    return "green";
  }

  if (["sick", "inactive", "low stock", "pending", "quarantine"].includes(normalized)) {
    return normalized === "pending" ? "amber" : "red";
  }

  if (["warning", "monitor", "attention"].includes(normalized)) {
    return "amber";
  }

  if (["high risk", "critical"].includes(normalized)) {
    return "red";
  }

  if (["recovery", "online"].includes(normalized)) {
    return "blue";
  }

  return "gray";
};

const animalEmoji = (species) => ({
  Cattle: "🐄",
  Goat: "🐐",
  Horse: "🐴",
  Pig: "🐷",
  Sheep: "🐑",
  Poultry: "🐔",
}[species] || "🐾");

const getAnimalSpecies = (animal) => animal?.type || animal?.species || "Unknown";

const parseTemperature = (animal) => {
  const raw = animal?.temperature ?? animal?.tempC ?? animal?.bodyTemperature;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
};

const getTemperatureState = (temperature) => {
  if (temperature == null) {
    return "unknown";
  }

  if (temperature >= 40) {
    return "critical";
  }

  if (temperature >= 39.3) {
    return "warning";
  }

  return "normal";
};

const getDiseaseRisk = (animal) => {
  let riskScore = 0;
  const temperature = parseTemperature(animal);
  const tempState = getTemperatureState(temperature);
  const activity = String(animal?.activityLevel || "").toLowerCase();
  const feedIntake = String(animal?.feedIntake || "").toLowerCase();
  const status = String(animal?.status || "").toLowerCase();

  if (tempState === "critical") {
    riskScore += 2;
  } else if (tempState === "warning") {
    riskScore += 1;
  }

  if (["low", "very low", "none", "reduced"].includes(activity)) {
    riskScore += 1;
  }

  if (["low", "reduced", "poor"].includes(feedIntake)) {
    riskScore += 1;
  }

  if (["sick", "quarantine"].includes(status)) {
    riskScore += 2;
  }

  if (riskScore >= 3) {
    return "High Risk";
  }

  if (riskScore >= 1) {
    return "Warning";
  }

  return "Normal";
};

const formatTemperature = (temperature) => {
  if (temperature == null) {
    return "No data";
  }
  return `${temperature.toFixed(1)}°C`;
};

const AnimalAvatar = ({ animal }) => {
  const [failed, setFailed] = useState(false);
  const src = animal?.imageUrl || animal?.photoUrl || animal?.image;

  if (!src || failed) {
    return <div className="animal-avatar-fallback">{animalEmoji(getAnimalSpecies(animal))}</div>;
  }

  return <img className="animal-avatar" src={src} alt={animal?.name || "Animal"} onError={() => setFailed(true)} />;
};

const StatusTag = ({ value }) => <span className={`tag tag-${toneForStatus(value)}`}>{value}</span>;

const MetricCard = ({ label, value, sublabel, tone = "green" }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className={`stat-value ${tone}`}>{value}</div>
    <div className="stat-sub">{sublabel}</div>
  </div>
);

const SectionCard = ({ title, action, children, className = "" }) => (
  <div className={`card ${className}`}>
    <div className="card-header">
      <span className="card-title">{title}</span>
      {action}
    </div>
    <div className="card-body">{children}</div>
  </div>
);

function DashboardView({ app = {}, darkMode, setDarkMode }) {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    handleLogoutAndRedirect,
    loadData,
    dashboardMessage,
    loading,
    animals = [],
    feeders = [],
    feedLogs = [],
    vaccinations = [],
    healthRecords = [],
    staff = [],
  } = app;

  const [flash, setFlash] = useState("");
  const [herdTab, setHerdTab] = useState("list");
  const [healthTab, setHealthTab] = useState("vacc");
  const [feedTab, setFeedTab] = useState("inventory");

  const [animalDraft, setAnimalDraft] = useState({
    name: "",
    type: "Cattle",
    breed: "",
    gender: "Female",
    dob: "",
    weight: "",
    pen: "",
    tag: "",
    status: "Healthy",
    temperature: "",
    activityLevel: "Normal",
    feedIntake: "Normal",
    imageUrl: "",
    lastChecked: "",
  });

  const [healthDraft, setHealthDraft] = useState({
    animalId: "",
    condition: "",
    symptoms: "",
    treatment: "",
    date: today(),
  });

  const [vaccinationDraft, setVaccinationDraft] = useState({
    animalId: "",
    vaccineType: "",
    dueDate: "",
    status: "pending",
  });

  const [feederDraft, setFeederDraft] = useState({
    location: "",
    status: "Active",
    feedLevel: "80",
    batteryLevel: "90",
    networkStatus: "Online",
    schedule: "Morning / Evening",
    feedQuantity: "15",
  });

  const [feedLogDraft, setFeedLogDraft] = useState({
    animalId: "",
    feederId: "",
    quantity: "",
  });

  const [staffDraft, setStaffDraft] = useState({
    name: "",
    role: "Staff",
    email: "",
    phone: "",
    status: "Active",
    joined: today(),
  });

  const animalsById = useMemo(() => new Map(animals.map((animal) => [String(animal._id), animal])), [animals]);

  const healthyAnimals = animals.filter((animal) => {
    const status = String(animal.status || "Healthy").toLowerCase();
    return status === "healthy" || status === "active";
  }).length;

  const sickAnimals = animals.filter((animal) => ["sick", "quarantine"].includes(String(animal.status || "").toLowerCase()));
  const lowFeeders = feeders.filter((feeder) => Number(feeder.feedLevel ?? feeder.stock ?? 0) < 30);
  const animalsWithTemp = animals
    .map((animal) => ({ animal, temperature: parseTemperature(animal) }))
    .filter((entry) => entry.temperature != null);
  const averageTemperature = animalsWithTemp.length
    ? animalsWithTemp.reduce((sum, entry) => sum + entry.temperature, 0) / animalsWithTemp.length
    : null;
  const hottestAnimal = animalsWithTemp.length
    ? animalsWithTemp.reduce((top, current) => (current.temperature > top.temperature ? current : top), animalsWithTemp[0])
    : null;
  const feverAnimals = animalsWithTemp.filter((entry) => entry.temperature >= 39.8);
  const abnormalActivityCount = animals.filter((animal) => {
    const activity = String(animal.activityLevel || "").toLowerCase();
    return ["low", "very low", "none", "reduced"].includes(activity);
  }).length;
  const latestAnimalUpdate = animals
    .map((animal) => animal.lastChecked || animal.checkedAt || animal.lastUpdated || animal.updatedAt || animal.createdAt)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => Number.isFinite(value.getTime()))
    .sort((left, right) => right - left)[0];
  const pendingVaccinations = vaccinations.filter((vaccination) => {
    const status = String(vaccination.status || "pending").toLowerCase();
    return status !== "done" && status !== "completed";
  });

  const totalFeed = feedLogs.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0);
  const totalFeedValue = feeders.reduce((sum, feeder) => {
    const level = Number(feeder.feedLevel ?? feeder.stock ?? 0) || 0;
    const quantity = Number(feeder.feedQuantity ?? 0) || 0;
    return sum + level * Math.max(quantity, 1);
  }, 0);

  const pageTitle = pageTitles[activeTab] || "FarmTrack Pro";

  const submitAnimal = async (event) => {
    event.preventDefault();
    try {
      await requestJson("/animals", {
        method: "POST",
        body: JSON.stringify({
          ...animalDraft,
          species: animalDraft.type,
          weight: animalDraft.weight === "" ? null : Number(animalDraft.weight),
          temperature: animalDraft.temperature === "" ? null : Number(animalDraft.temperature),
          lastChecked: animalDraft.lastChecked || new Date().toISOString(),
        }),
      });
      setAnimalDraft({
        name: "",
        type: "Cattle",
        breed: "",
        gender: "Female",
        dob: "",
        weight: "",
        pen: "",
        tag: "",
        status: "Healthy",
        temperature: "",
        activityLevel: "Normal",
        feedIntake: "Normal",
        imageUrl: "",
        lastChecked: "",
      });
      setFlash("Animal saved successfully.");
      await loadData?.();
      setHerdTab("list");
    } catch (error) {
      setFlash(`Unable to save animal: ${error.message}`);
    }
  };

  const submitVaccination = async (event) => {
    event.preventDefault();
    try {
      await requestJson("/vaccinations", {
        method: "POST",
        body: JSON.stringify(vaccinationDraft),
      });
      setVaccinationDraft({ animalId: "", vaccineType: "", dueDate: "", status: "pending" });
      setFlash("Vaccination logged successfully.");
      await loadData?.();
    } catch (error) {
      setFlash(`Unable to save vaccination: ${error.message}`);
    }
  };

  const submitHealthRecord = async (event) => {
    event.preventDefault();
    try {
      await requestJson("/health", {
        method: "POST",
        body: JSON.stringify(healthDraft),
      });
      setHealthDraft({ animalId: "", condition: "", symptoms: "", treatment: "", date: today() });
      setFlash("Health record saved successfully.");
      await loadData?.();
    } catch (error) {
      setFlash(`Unable to save health record: ${error.message}`);
    }
  };

  const submitFeeder = async (event) => {
    event.preventDefault();
    try {
      await requestJson("/feeders", {
        method: "POST",
        body: JSON.stringify({
          ...feederDraft,
          feedLevel: feederDraft.feedLevel === "" ? null : Number(feederDraft.feedLevel),
          batteryLevel: feederDraft.batteryLevel === "" ? null : Number(feederDraft.batteryLevel),
          feedQuantity: feederDraft.feedQuantity === "" ? null : Number(feederDraft.feedQuantity),
        }),
      });
      setFlash("Feeder saved successfully.");
      await loadData?.();
      setFeederDraft({
        location: "",
        status: "Active",
        feedLevel: "80",
        batteryLevel: "90",
        networkStatus: "Online",
        schedule: "Morning / Evening",
        feedQuantity: "15",
      });
    } catch (error) {
      setFlash(`Unable to save feeder: ${error.message}`);
    }
  };

  const submitFeedLog = async (event) => {
    event.preventDefault();
    try {
      await requestJson("/feeds", {
        method: "POST",
        body: JSON.stringify({
          animalId: feedLogDraft.animalId,
          feederId: feedLogDraft.feederId,
          quantity: Number(feedLogDraft.quantity),
        }),
      });
      setFeedLogDraft({ animalId: "", feederId: "", quantity: "" });
      setFlash("Feed log saved successfully.");
      await loadData?.();
    } catch (error) {
      setFlash(`Unable to save feed log: ${error.message}`);
    }
  };

  const submitStaff = async (event) => {
    event.preventDefault();
    try {
      await requestJson("/staff", {
        method: "POST",
        body: JSON.stringify(staffDraft),
      });
      setStaffDraft({
        name: "",
        role: "Staff",
        email: "",
        phone: "",
        status: "Active",
        joined: today(),
      });
      setFlash("User saved successfully.");
      await loadData?.();
    } catch (error) {
      setFlash(`Unable to save staff member: ${error.message}`);
    }
  };

  const renderOverview = () => (
    <>
      <div className="stats-grid">
        <MetricCard label="Total Animals" value={animals.length} sublabel={`in ${new Set(animals.map((animal) => animal.pen || "Unassigned")).size} pens`} />
        <MetricCard label="Healthy" value={healthyAnimals} sublabel="animals in good condition" tone="green" />
        <MetricCard label="Sick / Quarantine" value={sickAnimals.length} sublabel="need attention" tone="red" />
        <MetricCard label="Feed Items" value={feeders.length} sublabel={`${lowFeeders.length} low stock`} />
      </div>

      <SectionCard title="Health Metrics" className="health-metrics-card">
        <div className="stats-grid health-metrics-grid">
          <MetricCard
            label="Average Body Temperature"
            value={formatTemperature(averageTemperature)}
            sublabel={latestAnimalUpdate ? `Last checked ${latestAnimalUpdate.toLocaleString()}` : "No check records yet"}
            tone={averageTemperature != null && averageTemperature >= 39.3 ? "amber" : "blue"}
          />
          <MetricCard
            label="Highest Temperature Animal"
            value={hottestAnimal ? hottestAnimal.animal.name : "No data"}
            sublabel={hottestAnimal ? formatTemperature(hottestAnimal.temperature) : "Add temperature readings"}
            tone={hottestAnimal && hottestAnimal.temperature >= 40 ? "red" : "amber"}
          />
          <MetricCard label="Animals Above Fever Threshold" value={feverAnimals.length} sublabel="Threshold >= 39.8°C" tone="red" />
          <MetricCard label="Abnormal Activity Count" value={abnormalActivityCount} sublabel="Low/reduced movement" tone={abnormalActivityCount ? "amber" : "green"} />
        </div>
      </SectionCard>

      <AnimatePresence>
        {flash ? (
          <motion.div className="alert alert-info" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Bell size={16} />
            <span>{flash}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {dashboardMessage ? (
        <div className="alert alert-success">
          <CheckCircle size={16} />
          <span>{dashboardMessage}</span>
        </div>
      ) : null}

      {sickAnimals.length ? (
        <div className="alert alert-danger">
          <AlertTriangle size={16} />
          <span>
            Sick animals: <strong>{sickAnimals.map((animal) => animal.name).join(", ")}</strong> require attention.
          </span>
        </div>
      ) : null}

      {lowFeeders.length ? (
        <div className="alert alert-warn">
          <CircleAlert size={16} />
          <span>
            Low feed level: <strong>{lowFeeders.map((feeder) => feeder.location || feeder.name || "Feeder").join(", ")}</strong>
          </span>
        </div>
      ) : null}

      {pendingVaccinations.length ? (
        <div className="alert alert-info">
          <Syringe size={16} />
          <span>
            <strong>{pendingVaccinations.length}</strong> vaccination(s) pending.
          </span>
        </div>
      ) : null}

      <div className="split-grid">
        <SectionCard title="Recent Animals">
          {animals.length ? (
            animals.slice(0, 5).map((animal) => (
              <div key={animal._id} className="row-item">
                <div className="row-icon"><AnimalAvatar animal={animal} /></div>
                <div className="row-main">
                  <strong>{animal.name}</strong>
                  <span>{getAnimalSpecies(animal)} {animal.pen ? `• ${animal.pen}` : ""}</span>
                </div>
                <div className="row-tags">
                  <span className={`temp-chip temp-${getTemperatureState(parseTemperature(animal))}`}>{formatTemperature(parseTemperature(animal))}</span>
                  <StatusTag value={getDiseaseRisk(animal)} />
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No animals yet.</div>
          )}
        </SectionCard>

        <SectionCard title="Feed Inventory">
          {feeders.length ? (
            feeders.slice(0, 5).map((feeder) => (
              <div key={feeder._id} className="feed-line">
                <div className="feed-line-head">
                  <span>{feeder.location || "Unnamed feeder"}</span>
                  <strong>{feeder.feedLevel ?? feeder.stock ?? 0}%</strong>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, Number(feeder.feedLevel ?? feeder.stock ?? 0) || 0)}%`,
                      background: Number(feeder.feedLevel ?? feeder.stock ?? 0) < 30 ? "#c04a30" : "#4a7a4a",
                    }}
                  />
                </div>
                <div className="feed-meta">
                  <span>{feeder.schedule || "Morning / Evening"}</span>
                  <StatusTag value={feeder.status || "Active"} />
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No feeders yet.</div>
          )}
        </SectionCard>
      </div>
    </>
  );

  const renderHerd = () => {
    const herdTabs = [
      { id: "list", label: "Animal List" },
      { id: "add", label: "Add Animal" },
    ];

    return (
      <>
        <div className="tabs">
          {herdTabs.map((tab) => (
            <button key={tab.id} type="button" className={`tab ${herdTab === tab.id ? "active" : ""}`} onClick={() => setHerdTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {herdTab === "add" ? (
          <SectionCard title="Register New Animal">
            <form className="form-grid" onSubmit={submitAnimal}>
              <label className="fg">
                <span className="fl">Animal Name *</span>
                <input className="fi" value={animalDraft.name} onChange={(event) => setAnimalDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Bessie" required />
              </label>
              <label className="fg">
                <span className="fl">Species *</span>
                <select className="fs" value={animalDraft.type} onChange={(event) => setAnimalDraft((current) => ({ ...current, type: event.target.value }))}>
                  {[
                    "Cattle",
                    "Goat",
                    "Horse",
                    "Pig",
                    "Sheep",
                    "Poultry",
                  ].map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="fg">
                <span className="fl">Breed</span>
                <input className="fi" value={animalDraft.breed} onChange={(event) => setAnimalDraft((current) => ({ ...current, breed: event.target.value }))} placeholder="e.g. Holstein" />
              </label>
              <label className="fg">
                <span className="fl">Gender</span>
                <select className="fs" value={animalDraft.gender} onChange={(event) => setAnimalDraft((current) => ({ ...current, gender: event.target.value }))}>
                  <option>Female</option>
                  <option>Male</option>
                </select>
              </label>
              <label className="fg">
                <span className="fl">Date of Birth</span>
                <input className="fi" type="date" value={animalDraft.dob} onChange={(event) => setAnimalDraft((current) => ({ ...current, dob: event.target.value }))} />
              </label>
              <label className="fg">
                <span className="fl">Weight (kg)</span>
                <input className="fi" type="number" value={animalDraft.weight} onChange={(event) => setAnimalDraft((current) => ({ ...current, weight: event.target.value }))} placeholder="0" />
              </label>
              <label className="fg">
                <span className="fl">Pen / Location</span>
                <input className="fi" value={animalDraft.pen} onChange={(event) => setAnimalDraft((current) => ({ ...current, pen: event.target.value }))} placeholder="e.g. Pen A" />
              </label>
              <label className="fg">
                <span className="fl">Tag Number</span>
                <input className="fi" value={animalDraft.tag} onChange={(event) => setAnimalDraft((current) => ({ ...current, tag: event.target.value }))} placeholder="e.g. C-001" />
              </label>
              <label className="fg">
                <span className="fl">Status</span>
                <select className="fs" value={animalDraft.status} onChange={(event) => setAnimalDraft((current) => ({ ...current, status: event.target.value }))}>
                  <option>Healthy</option>
                  <option>Sick</option>
                  <option>Quarantine</option>
                </select>
              </label>
              <label className="fg">
                <span className="fl">Body Temperature (°C)</span>
                <input className="fi" type="number" step="0.1" value={animalDraft.temperature} onChange={(event) => setAnimalDraft((current) => ({ ...current, temperature: event.target.value }))} placeholder="e.g. 38.7" />
              </label>
              <label className="fg">
                <span className="fl">Activity Level</span>
                <select className="fs" value={animalDraft.activityLevel} onChange={(event) => setAnimalDraft((current) => ({ ...current, activityLevel: event.target.value }))}>
                  <option>Normal</option>
                  <option>Low</option>
                  <option>Very Low</option>
                  <option>High</option>
                </select>
              </label>
              <label className="fg">
                <span className="fl">Feed Intake</span>
                <select className="fs" value={animalDraft.feedIntake} onChange={(event) => setAnimalDraft((current) => ({ ...current, feedIntake: event.target.value }))}>
                  <option>Normal</option>
                  <option>Low</option>
                  <option>Reduced</option>
                  <option>Poor</option>
                </select>
              </label>
              <label className="fg">
                <span className="fl">Last Checked</span>
                <input className="fi" type="datetime-local" value={animalDraft.lastChecked} onChange={(event) => setAnimalDraft((current) => ({ ...current, lastChecked: event.target.value }))} />
              </label>
              <label className="fg">
                <span className="fl">Animal Image URL</span>
                <input className="fi" value={animalDraft.imageUrl} onChange={(event) => setAnimalDraft((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://..." />
              </label>
              <button className="btn btn-primary" type="submit">
                <Plus size={14} /> Register Animal
              </button>
            </form>
          </SectionCard>
        ) : (
          <SectionCard title="Animal List">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Species / Breed</th>
                    <th>Gender</th>
                    <th>DOB</th>
                    <th>Weight</th>
                    <th>Temperature</th>
                    <th>Disease Risk</th>
                    <th>Pen</th>
                    <th>Tag</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {animals.length ? animals.map((animal) => (
                    <tr key={animal._id}>
                      <td>
                        <div className="animal-cell">
                          <AnimalAvatar animal={animal} />
                          <span style={{ fontWeight: 600 }}>{animal.name}</span>
                        </div>
                      </td>
                      <td>{getAnimalSpecies(animal)} / {animal.breed || "—"}</td>
                      <td>{animal.gender || "—"}</td>
                      <td>{animal.dob || "—"}</td>
                      <td>{animal.weight ?? "—"} kg</td>
                      <td><span className={`temp-chip temp-${getTemperatureState(parseTemperature(animal))}`}>{formatTemperature(parseTemperature(animal))}</span></td>
                      <td><StatusTag value={getDiseaseRisk(animal)} /></td>
                      <td>{animal.pen || "—"}</td>
                      <td><code className="inline-code">{animal.tag || "—"}</code></td>
                      <td><StatusTag value={animal.status || "Healthy"} /></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="10">
                        <div className="empty-state">No animals found.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </>
    );
  };

  const renderHealth = () => {
    const tabs = [
      { id: "vacc", label: "Vaccination Log" },
      { id: "treatments", label: "Treatments" },
      { id: "alerts", label: "Health Alerts" },
    ];

    return (
      <>
        <div className="tabs">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={`tab ${healthTab === tab.id ? "active" : ""}`} onClick={() => setHealthTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {healthTab === "vacc" ? (
          <>
            <SectionCard title="Log Vaccination" action={<span className="tag tag-blue">{pendingVaccinations.length} pending</span>}>
              <form className="form-grid" onSubmit={submitVaccination}>
                <label className="fg">
                  <span className="fl">Animal *</span>
                  <select className="fs" value={vaccinationDraft.animalId} onChange={(event) => setVaccinationDraft((current) => ({ ...current, animalId: event.target.value }))} required>
                    <option value="">Select...</option>
                    {animals.map((animal) => <option key={animal._id} value={animal._id}>{animal.name}</option>)}
                  </select>
                </label>
                <label className="fg">
                  <span className="fl">Vaccine *</span>
                  <input className="fi" value={vaccinationDraft.vaccineType} onChange={(event) => setVaccinationDraft((current) => ({ ...current, vaccineType: event.target.value }))} placeholder="e.g. FMD" required />
                </label>
                <label className="fg">
                  <span className="fl">Date Due</span>
                  <input className="fi" type="date" value={vaccinationDraft.dueDate} onChange={(event) => setVaccinationDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                </label>
                <label className="fg">
                  <span className="fl">Status</span>
                  <select className="fs" value={vaccinationDraft.status} onChange={(event) => setVaccinationDraft((current) => ({ ...current, status: event.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="done">Done</option>
                  </select>
                </label>
                <button className="btn btn-primary" type="submit">
                  <Syringe size={14} /> Save
                </button>
              </form>
            </SectionCard>

            <SectionCard title="Vaccination Records">
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Animal</th>
                      <th>Vaccine</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccinations.length ? vaccinations.map((vaccination) => {
                      const animal = animalsById.get(String(vaccination.animalId || vaccination.animal?._id));

                      return (
                        <tr key={vaccination._id}>
                          <td style={{ fontWeight: 600 }}>{animal ? `${animalEmoji(getAnimalSpecies(animal))} ${animal.name}` : "Unknown"}</td>
                          <td>{vaccination.vaccineType || vaccination.vaccine || "—"}</td>
                          <td>{vaccination.dueDate || vaccination.next || "—"}</td>
                          <td><StatusTag value={vaccination.status || "pending"} /></td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="4"><div className="empty-state">No vaccination records found.</div></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}

        {healthTab === "treatments" ? (
          <>
            <SectionCard title="Add Treatment">
              <form className="form-grid" onSubmit={submitHealthRecord}>
                <label className="fg">
                  <span className="fl">Animal *</span>
                  <select className="fs" value={healthDraft.animalId} onChange={(event) => setHealthDraft((current) => ({ ...current, animalId: event.target.value }))} required>
                    <option value="">Select...</option>
                    {animals.map((animal) => <option key={animal._id} value={animal._id}>{animal.name}</option>)}
                  </select>
                </label>
                <label className="fg">
                  <span className="fl">Condition *</span>
                  <input className="fi" value={healthDraft.condition} onChange={(event) => setHealthDraft((current) => ({ ...current, condition: event.target.value }))} placeholder="e.g. Respiratory infection" required />
                </label>
                <label className="fg">
                  <span className="fl">Symptoms</span>
                  <input className="fi" value={healthDraft.symptoms} onChange={(event) => setHealthDraft((current) => ({ ...current, symptoms: event.target.value }))} placeholder="Cough, fever, reduced appetite" />
                </label>
                <label className="fg">
                  <span className="fl">Treatment</span>
                  <input className="fi" value={healthDraft.treatment} onChange={(event) => setHealthDraft((current) => ({ ...current, treatment: event.target.value }))} placeholder="Medicine or care plan" />
                </label>
                <label className="fg">
                  <span className="fl">Date</span>
                  <input className="fi" type="date" value={healthDraft.date} onChange={(event) => setHealthDraft((current) => ({ ...current, date: event.target.value }))} />
                </label>
                <button className="btn btn-primary" type="submit">
                  <Heart size={14} /> Save
                </button>
              </form>
            </SectionCard>

            <SectionCard title="Treatment Records">
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Animal</th>
                      <th>Condition</th>
                      <th>Treatment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthRecords.length ? healthRecords.map((record) => {
                      const animal = animalsById.get(String(record.animalId || record.animal?._id));

                      return (
                        <tr key={record._id}>
                          <td style={{ fontWeight: 600 }}>{animal ? `${animalEmoji(getAnimalSpecies(animal))} ${animal.name}` : "Unknown"}</td>
                          <td>{record.condition || "—"}</td>
                          <td>{record.treatment || record.medicine || "—"}</td>
                          <td>{record.date || "—"}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="4"><div className="empty-state">No treatment records yet.</div></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}

        {healthTab === "alerts" ? (
          <div className="stack-gap">
            {sickAnimals.map((animal) => (
              <div key={animal._id} className="alert alert-danger">
                <AlertTriangle size={16} />
                <span>
                  <strong>{animal.name}</strong> ({animal.tag || animal._id}) is marked as {animal.status || "Sick"}.
                </span>
              </div>
            ))}
            {feverAnimals.map((entry) => (
              <div key={`temp-${entry.animal._id}`} className="alert alert-warn">
                <Thermometer size={16} />
                <span>
                  <strong>{entry.animal.name}</strong> is at {formatTemperature(entry.temperature)} and requires monitoring.
                </span>
              </div>
            ))}
            {pendingVaccinations.map((vaccination) => {
              const animal = animalsById.get(String(vaccination.animalId || vaccination.animal?._id));

              return (
                <div key={vaccination._id} className="alert alert-info">
                  <Syringe size={16} />
                  <span>
                    {animal?.name || "Unknown"} needs {vaccination.vaccineType || vaccination.vaccine || "a vaccination"}.
                  </span>
                </div>
              );
            })}
            {lowFeeders.map((feeder) => (
              <div key={feeder._id} className="alert alert-warn">
                <CircleAlert size={16} />
                <span>
                  {feeder.location || "A feeder"} is down to {feeder.feedLevel ?? feeder.stock ?? 0}%.
                </span>
              </div>
            ))}
            {!sickAnimals.length && !pendingVaccinations.length && !lowFeeders.length && !feverAnimals.length ? (
              <div className="alert alert-success">
                <CheckCircle size={16} />
                <span>No active health alerts.</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    );
  };

  const renderFeeding = () => {
    const tabs = [
      { id: "inventory", label: "Feed Inventory" },
      { id: "log", label: "Consumption Log" },
    ];

    return (
      <>
        <div className="tabs">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={`tab ${feedTab === tab.id ? "active" : ""}`} onClick={() => setFeedTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {feedTab === "inventory" ? (
          <>
            <SectionCard title="Add Feeder">
              <form className="form-grid" onSubmit={submitFeeder}>
                <label className="fg">
                  <span className="fl">Location *</span>
                  <input className="fi" value={feederDraft.location} onChange={(event) => setFeederDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Pen A / Shed 1" required />
                </label>
                <label className="fg">
                  <span className="fl">Status</span>
                  <select className="fs" value={feederDraft.status} onChange={(event) => setFeederDraft((current) => ({ ...current, status: event.target.value }))}>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Maintenance</option>
                  </select>
                </label>
                <label className="fg">
                  <span className="fl">Feed Level (%)</span>
                  <input className="fi" type="number" value={feederDraft.feedLevel} onChange={(event) => setFeederDraft((current) => ({ ...current, feedLevel: event.target.value }))} />
                </label>
                <label className="fg">
                  <span className="fl">Battery (%)</span>
                  <input className="fi" type="number" value={feederDraft.batteryLevel} onChange={(event) => setFeederDraft((current) => ({ ...current, batteryLevel: event.target.value }))} />
                </label>
                <label className="fg">
                  <span className="fl">Network Status</span>
                  <input className="fi" value={feederDraft.networkStatus} onChange={(event) => setFeederDraft((current) => ({ ...current, networkStatus: event.target.value }))} />
                </label>
                <label className="fg">
                  <span className="fl">Schedule</span>
                  <input className="fi" value={feederDraft.schedule} onChange={(event) => setFeederDraft((current) => ({ ...current, schedule: event.target.value }))} />
                </label>
                <label className="fg">
                  <span className="fl">Feed Quantity</span>
                  <input className="fi" type="number" value={feederDraft.feedQuantity} onChange={(event) => setFeederDraft((current) => ({ ...current, feedQuantity: event.target.value }))} />
                </label>
                <button className="btn btn-primary" type="submit">
                  <Plus size={14} /> Save Feeder
                </button>
              </form>
            </SectionCard>

            <SectionCard title="Feed Inventory" action={<span className="tag tag-blue">Total value approx. ₹{totalFeedValue.toLocaleString("en-IN")}</span>}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Feed</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Unit</th>
                      <th>Schedule</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeders.length ? feeders.map((feeder) => (
                      <tr key={feeder._id}>
                        <td style={{ fontWeight: 600 }}>{feeder.location || feeder.name || "Feeder"}</td>
                        <td>{feeder.networkStatus || feeder.category || "Feed"}</td>
                        <td>{feeder.feedLevel ?? feeder.stock ?? 0}</td>
                        <td>{feeder.unit || "%"}</td>
                        <td>{feeder.schedule || "Morning / Evening"}</td>
                        <td><StatusTag value={feeder.status || "Active"} /></td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6"><div className="empty-state">No feeders available.</div></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}

        {feedTab === "log" ? (
          <>
            <SectionCard title="Log Feed Consumption">
              <form className="form-grid" onSubmit={submitFeedLog}>
                <label className="fg">
                  <span className="fl">Animal *</span>
                  <select className="fs" value={feedLogDraft.animalId} onChange={(event) => setFeedLogDraft((current) => ({ ...current, animalId: event.target.value }))} required>
                    <option value="">Select...</option>
                    {animals.map((animal) => <option key={animal._id} value={animal._id}>{animal.name}</option>)}
                  </select>
                </label>
                <label className="fg">
                  <span className="fl">Feeder *</span>
                  <select className="fs" value={feedLogDraft.feederId} onChange={(event) => setFeedLogDraft((current) => ({ ...current, feederId: event.target.value }))} required>
                    <option value="">Select...</option>
                    {feeders.map((feeder) => <option key={feeder._id} value={feeder._id}>{feeder.location || feeder.name || "Feeder"}</option>)}
                  </select>
                </label>
                <label className="fg">
                  <span className="fl">Amount *</span>
                  <input className="fi" type="number" value={feedLogDraft.quantity} onChange={(event) => setFeedLogDraft((current) => ({ ...current, quantity: event.target.value }))} required />
                </label>
                <button className="btn btn-primary" type="submit">
                  <Zap size={14} /> Log
                </button>
              </form>
            </SectionCard>

            <SectionCard title="Consumption Log">
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Animal</th>
                      <th>Feeder</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedLogs.length ? feedLogs.slice().reverse().slice(0, 12).map((log) => {
                      const animal = animalsById.get(String(log.animalId || log.animal?._id || log.animal));
                      const feeder = feeders.find((item) => String(item._id) === String(log.feederId || log.feeder?._id || log.feeder));

                      return (
                        <tr key={log._id}>
                          <td>{log.date ? new Date(log.date).toLocaleDateString() : "—"}</td>
                          <td>{animal ? `${animalEmoji(getAnimalSpecies(animal))} ${animal.name}` : "Unknown"}</td>
                          <td>{feeder?.location || feeder?.name || "—"}</td>
                          <td>{log.quantity || 0}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="4"><div className="empty-state">No consumption logs found.</div></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}
      </>
    );
  };

  const renderReports = () => (
    <div className="report-grid">
      <div className="report-card">
        <div className="report-head">
          <strong>Herd Report</strong>
          <span>Animals and status</span>
        </div>
        <button className="btn btn-outline" type="button" onClick={() => downloadCSV("herd_report.csv", [["Name", "Type", "Breed", "Gender", "DOB", "Weight", "Pen", "Tag", "Status"], ...animals.map((animal) => [animal.name, animal.type, animal.breed, animal.gender, animal.dob, animal.weight, animal.pen, animal.tag, animal.status])])}>
          Download CSV
        </button>
      </div>

      <div className="report-card">
        <div className="report-head">
          <strong>Vaccination Report</strong>
          <span>History and pending</span>
        </div>
        <button className="btn btn-outline" type="button" onClick={() => downloadCSV("vaccination_report.csv", [["Animal", "Vaccine", "Due Date", "Status"], ...vaccinations.map((vaccination) => [animalsById.get(String(vaccination.animalId || vaccination.animal?._id))?.name || "", vaccination.vaccineType || vaccination.vaccine, vaccination.dueDate || vaccination.next, vaccination.status])])}>
          Download CSV
        </button>
      </div>

      <div className="report-card">
        <div className="report-head">
          <strong>Health Report</strong>
          <span>Treatment records</span>
        </div>
        <button className="btn btn-outline" type="button" onClick={() => downloadCSV("health_report.csv", [["Animal", "Condition", "Treatment", "Date"], ...healthRecords.map((record) => [animalsById.get(String(record.animalId || record.animal?._id))?.name || "", record.condition, record.treatment || record.medicine, record.date])])}>
          Download CSV
        </button>
      </div>

      <div className="report-card">
        <div className="report-head">
          <strong>Feed Report</strong>
          <span>Inventory and consumption</span>
        </div>
        <button className="btn btn-outline" type="button" onClick={() => downloadCSV("feed_report.csv", [["Location", "Status", "Feed Level", "Battery", "Schedule"], ...feeders.map((feeder) => [feeder.location, feeder.status, feeder.feedLevel, feeder.batteryLevel, feeder.schedule])])}>
          Download CSV
        </button>
      </div>
    </div>
  );

  const renderStaff = () => (
    <>
      <SectionCard title="Add New User">
        <form className="form-grid" onSubmit={submitStaff}>
          <label className="fg">
            <span className="fl">Name *</span>
            <input className="fi" value={staffDraft.name} onChange={(event) => setStaffDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Full Name" required />
          </label>
          <label className="fg">
            <span className="fl">Email *</span>
            <input className="fi" type="email" value={staffDraft.email} onChange={(event) => setStaffDraft((current) => ({ ...current, email: event.target.value }))} placeholder="email@farm.com" required />
          </label>
          <label className="fg">
            <span className="fl">Role</span>
            <select className="fs" value={staffDraft.role} onChange={(event) => setStaffDraft((current) => ({ ...current, role: event.target.value }))}>
              <option>Admin</option>
              <option>Staff</option>
              <option>HoD</option>
            </select>
          </label>
          <label className="fg">
            <span className="fl">Status</span>
            <select className="fs" value={staffDraft.status} onChange={(event) => setStaffDraft((current) => ({ ...current, status: event.target.value }))}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
          <label className="fg">
            <span className="fl">Phone</span>
            <input className="fi" value={staffDraft.phone} onChange={(event) => setStaffDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Contact number" />
          </label>
          <button className="btn btn-primary" type="submit">
            <Plus size={14} /> Add User
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Users">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {staff.length ? staff.map((user) => (
                <tr key={user._id}>
                  <td style={{ fontWeight: 600 }}>{user.name}</td>
                  <td>{user.email}</td>
                  <td><StatusTag value={user.role || "Staff"} /></td>
                  <td><StatusTag value={user.status || "Active"} /></td>
                  <td>{user.joined || new Date(user.createdAt || Date.now()).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5"><div className="empty-state">No staff records found.</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );

  const renderSettings = () => (
    <SectionCard title="System Info">
      <div className="grid-info">
        <div className="info-field">
          <div className="if-label">Backend API</div>
          <div className="if-value" style={{ color: "#2d6a2d" }}>Connected</div>
        </div>
        <div className="info-field">
          <div className="if-label">API URL</div>
          <div className="if-value">/api</div>
        </div>
        <div className="info-field">
          <div className="if-label">Logged In As</div>
          <div className="if-value">{currentUser?.name || currentUser?.email || "Admin"}</div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-outline" type="button" onClick={() => setDarkMode?.(!darkMode)}>
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
        <button className="btn btn-primary" type="button" onClick={() => loadData?.()}>
          <RefreshCcw size={14} /> Refresh Data
        </button>
        <button className="btn btn-danger" type="button" onClick={handleLogoutAndRedirect}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div className="hint-box" style={{ marginTop: 18 }}>
        <strong>FarmTrack Pro</strong> is connected to the local backend and uses the same collections as the HTML mockup: animals, vaccinations, health records, feeders, feed logs, and staff.
      </div>
    </SectionCard>
  );

  const renderSection = () => {
    switch (activeTab) {
      case "livestock":
        return renderHerd();
      case "health":
        return renderHealth();
      case "feeding":
        return renderFeeding();
      case "reports":
        return renderReports();
      case "staff":
        return renderStaff();
      case "settings":
        return renderSettings();
      case "overview":
      default:
        return renderOverview();
    }
  };

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🐄</div>
          <div className="logo-text">
            FarmTrack Pro
            <span>Livestock System</span>
          </div>
        </div>

        <div className="user-panel">
          <div className="user-info">
            <div className="user-avatar">{(currentUser?.name || currentUser?.email || "A")[0].toUpperCase()}</div>
            <div>
              <div className="user-name">{currentUser?.name || currentUser?.email || "Admin User"}</div>
              <div className="user-role">{currentUser?.role || "Administrator"}</div>
            </div>
          </div>
        </div>

        <div className="nav-section-label">Main Menu</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;

            return (
              <button key={item.id} type="button" className={`nav-item ${active ? "active" : ""}`} onClick={() => setActiveTab?.(item.id)}>
                <Icon className="nav-icon" size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="logout-btn" onClick={handleLogoutAndRedirect}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <div className="page-title">{pageTitle}</div>
            <div className="page-sub">Livestock management dashboard</div>
          </div>

          <div className="topbar-right">
            <div className="date-badge">📅 {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
            <button className="topbar-icon-button" type="button" onClick={() => loadData?.()} title="Refresh data">
              <RefreshCcw size={14} />
            </button>
            <button className="topbar-icon-button" type="button" onClick={() => setDarkMode?.(!darkMode)} title="Toggle theme">
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <div className="topbar-pill">
              <UserTag currentUser={currentUser} />
            </div>
          </div>
        </header>

        <div className="content-area">
          {loading ? <div className="loading">Loading farm data...</div> : renderSection()}
        </div>
      </section>
    </main>
  );
}

const UserTag = ({ currentUser }) => {
  const name = currentUser?.name || currentUser?.email || "Admin";
  return (
    <>
      <Users size={14} />
      <span>{name}</span>
    </>
  );
};

export default DashboardView;