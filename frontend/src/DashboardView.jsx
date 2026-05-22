import { useMemo, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Icons from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { showNotification } from "./notifications";
import API_BASE from "./apiConfig.js";

const { Activity, AlertTriangle, CircleAlert, Users, Settings, Bell, FileText, Archive, Edit2, Trash2, Heart, Coffee, BarChart2, UserPlus, LogOut, Search, RefreshCcw, Sun, Moon, CheckCircle, Syringe, Plus, Thermometer, Zap } = Icons;

const pageTitles = {
  overview: "Dashboard",
  livestock: "Herd Management",
  health: "Health & Vet",
  feeding: "Feed Manager",
  reports: "Reports",
  doctor: "Doctor Dashboard",
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
  const response = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with ${response.status}`);
  }

  return data;
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

const getDiseaseRiskDetails = (animal) => {
  const reasons = [];
  const temperature = parseTemperature(animal);
  const activity = String(animal?.activityLevel || "").toLowerCase();
  const feedIntake = String(animal?.feedIntake || "").toLowerCase();
  const status = String(animal?.status || "").toLowerCase();
  let cause = "Physiological parameters are within expected limits";

  if (temperature != null) {
    if (temperature >= 40) {
      reasons.push(`Pyrexia / high fever (${temperature.toFixed(1)}°C)`);
    } else if (temperature >= 39.3) {
      reasons.push(`Elevated rectal temperature (${temperature.toFixed(1)}°C)`);
    }
  }

  if (["low", "very low", "none", "reduced"].includes(activity)) {
    reasons.push("Reduced activity / lethargy");
  }

  if (["low", "reduced", "poor"].includes(feedIntake)) {
    reasons.push("Reduced feed intake / anorexia");
  }

  if (["sick", "quarantine"].includes(status)) {
    reasons.push(`Clinical status flagged as ${animal?.status || "high risk"}`);
  }

  const hasFever = temperature != null && temperature >= 39.3;
  const hasActivityIssue = ["low", "very low", "none", "reduced"].includes(activity);
  const hasFeedIssue = ["low", "reduced", "poor"].includes(feedIntake);

  if (hasFever && hasActivityIssue) {
    cause = "Clinical pattern is compatible with an acute febrile illness, often seen with infectious or inflammatory disease processes";
  } else if (hasFever && hasFeedIssue) {
    cause = "Pyrexia with anorexia suggests a systemic inflammatory or infectious condition";
  } else if (status === "sick" || status === "quarantine") {
    cause = `The record is clinically flagged as ${animal?.status || "high risk"}, indicating close veterinary observation is warranted`;
  } else if (reasons.length) {
    cause = "Mild abnormal signs are present and warrant closer monitoring";
  }

  if (!reasons.length) {
    reasons.push("Rectal temperature, activity, and feed intake remain within expected limits");
  }

  return { reasons, cause };
};

// Lightweight Recharts-based report chart for feed consumption
function ReportChart({ feedLogs = [], days = 14 }) {
  // aggregate by date (YYYY-MM-DD)
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(now.getTime() - (days - 1) * dayMs);

  const map = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * dayMs);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  (feedLogs || []).forEach((log) => {
    const date = log.date || log.createdAt || log.timestamp || log.time;
    const d = date ? new Date(date) : null;
    const key = d ? d.toISOString().slice(0, 10) : null;
    if (!key) return;
    if (!map.has(key)) map.set(key, 0);
    map.set(key, (map.get(key) || 0) + (Number(log.quantity) || 0));
  });

  const data = Array.from(map.entries()).map(([date, value]) => ({ date, value }));
    const hasData = data.some((d) => d.value && d.value > 0);
    const renderData = hasData ? data : data.map((d, i) => ({ ...d, value: Math.round(Math.sin(i / Math.max(1, data.length / 6)) * 5 + 8 + (i % 3)) }));

  // Use ResizeObserver to measure container and avoid zero-size warnings
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 600, height: 160 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, Math.floor(entry.contentRect.width));
        const h = Math.max(120, Math.floor(entry.contentRect.height || 160));
        setSize({ width: w, height: h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 160 }}>
      <LineChart width={size.width} height={size.height} data={renderData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </div>
  );
}

const getJudgeNote = (riskLabel, riskDetails) => {
  if (riskLabel === "Normal") {
    return "Stable vitals";
  }

  const firstReason = (riskDetails?.reasons || []).find(Boolean);
  if (!firstReason) {
    return "Needs vet review";
  }

  return firstReason;
};

const getNextVaccine = (animal, vaccinations = []) => {
  const list = (vaccinations || []).filter((v) => String(v.animalId) === String(animal._id) || String(v.animal?._id) === String(animal._id));
  if (!list.length) return null;
  // find next due date
  const future = list.filter((v) => v.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  return future[0] || list[0];
};

const formatTemperature = (temperature) => {
  if (temperature == null) {
    return "No data";
  }
  return `${temperature.toFixed(1)}°C`;
};

const timeUntil = (iso) => {
  if (!iso) return "No date";
  try {
    const then = new Date(iso);
    const now = new Date();
    const diff = then - now;
    const abs = Math.abs(diff);
    const mins = Math.floor(abs / (1000 * 60));
    if (diff > 0) {
      if (mins < 60) return `in ${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `in ${hrs}h`;
      const days = Math.floor(hrs / 24);
      return `in ${days}d`;
    }
    // past
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch (e) {
    return "Invalid date";
  }
};

const daysSince = (iso) => {
  if (!iso) return Infinity;
  try {
    const then = new Date(iso);
    const now = new Date();
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  } catch (e) {
    return Infinity;
  }
};

const feedLevelNumeric = (animal) => {
  if (!animal) return null;
  if (animal.feedLevel != null) return Number(animal.feedLevel);
  if (animal.feedLevelPercent != null) return Number(animal.feedLevelPercent);
  const fi = String(animal.feedIntake || "").toLowerCase();
  const map = { none: 0, "very low": 5, low: 20, reduced: 40, normal: 70, good: 85, high: 95 };
  if (map[fi] != null) return map[fi];
  return null;
};

const isFeedAlert = (animal) => {
  // alert if feed intake string indicates low or lastFed older than 1 day
  const fi = String(animal.feedIntake || "").toLowerCase();
  if (["none", "very low", "low", "reduced"].includes(fi)) return true;
  // lastFed may be timestamp or ISO
  const lastFed = animal.lastFed || animal.last_fed || animal.lastFeed;
  const days = daysSince(lastFed);
  if (days === Infinity) return false;
  return days >= 1; // alert if not fed in 24+ hours
};

const Sparkline = ({ values = [], width = 80, height = 28, stroke = '#ef4444' }) => {
  if (!values.length) return <svg width={width} height={height}><text x="6" y="16" style={{fontSize:10,color:'#444'}}>no data</text></svg>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
    </svg>
  );
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
    searchTerm = "",
    setSearchTerm,
  } = app;

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [groupByBreed, setGroupByBreed] = useState(false);

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const data = await requestJson('/users');
      setUsersList(Array.isArray(data) ? data : []);
    } catch (err) {
      setFlash('Unable to load users: ' + err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') loadUsers();
  }, [activeTab]);

  const isAdmin = String(currentUser?.role || "").toLowerCase() === "admin";

  const [flash, setFlash] = useState("");
  const [herdTab, setHerdTab] = useState("list");
  const [healthTab, setHealthTab] = useState("vacc");
  const [feedTab, setFeedTab] = useState("inventory");

  // report controls
  const [reportRange, setReportRange] = useState(14);

  const visibleAnimals = useMemo(() => {
    const query = String(searchTerm || "").trim().toLowerCase();

    if (!query) {
      const list = [...animals];
      if (groupByBreed) {
        list.sort((x, y) => String(x.breed || '').localeCompare(String(y.breed || '')));
      }
      return list;
    }

    const filtered = animals.filter((animal) => {
      const haystack = [
        animal.name,
        animal.type,
        animal.species,
        animal.breed,
        animal.pen,
        animal.tag,
        animal.status,
        animal.gender,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    if (groupByBreed) {
      filtered.sort((x, y) => String(x.breed || '').localeCompare(String(y.breed || '')));
    }

    return filtered;
  }, [animals, searchTerm, groupByBreed]);

  // show toast notifications for feed alerts (once per animal per session)
  const seenFeedAlerts = useRef(new Set());
  useEffect(() => {
    if (!animals || !animals.length) return;
    const alerts = animals.filter(isFeedAlert);
    alerts.forEach((a) => {
      const key = a._id || a.tag || a.name;
      if (seenFeedAlerts.current.has(key)) return;
      seenFeedAlerts.current.add(key);
      const reason = String(a.feedIntake || '').toLowerCase();
      const message = reason ? `${a.name || a.tag || 'Animal'}: ${reason}` : `${a.name || a.tag || 'Animal'} has low feed intake or hasn't been fed recently`;
      showNotification(message, 'warning');
    });
  }, [animals]);

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
  const [animalPhotoPreview, setAnimalPhotoPreview] = useState("");
  const [animalPhotoFile, setAnimalPhotoFile] = useState(null);

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

  // Doctor appointments (consultations)
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentDraft, setAppointmentDraft] = useState({ animalId: "", appointment_date: "", symptoms: "" });
  const [diagnosisDrafts, setDiagnosisDrafts] = useState({});
  const [processingDiagnosis, setProcessingDiagnosis] = useState({});

  const [staffDraft, setStaffDraft] = useState({
    name: "",
    farmerId: "",
    password: "",
    role: "Staff",
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

  const handleAnimalPhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFlash("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFlash("Animal photos must be 5MB or smaller.");
      return;
    }

    setAnimalPhotoFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setAnimalPhotoPreview(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const clearAnimalPhoto = () => {
    setAnimalPhotoFile(null);
    setAnimalPhotoPreview("");
  };

  const uploadAnimalPhoto = async (animalId, file) => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`/api/animals/${animalId}/photo`, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || `Photo upload failed with ${response.status}`);
    }

    return payload;
  };

  // CSV/Excel export removed per user request — reports will show graphs/alerts only.

  const submitAnimal = async (event) => {
    event.preventDefault();
    try {
      const createdAnimal = await requestJson("/animals", {
        method: "POST",
        body: JSON.stringify({
          ...animalDraft,
          species: animalDraft.type,
          weight: animalDraft.weight === "" ? null : Number(animalDraft.weight),
          temperature: animalDraft.temperature === "" ? null : Number(animalDraft.temperature),
          lastChecked: animalDraft.lastChecked || new Date().toISOString(),
        }),
      });

      let uploadWarning = "";

      if (animalPhotoFile && createdAnimal?._id) {
        try {
          await uploadAnimalPhoto(createdAnimal._id, animalPhotoFile);
        } catch (uploadError) {
          uploadWarning = ` Animal photo saved later: ${uploadError.message}`;
        }
      }

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
      clearAnimalPhoto();
      setFlash(`Animal saved successfully.${uploadWarning}`);
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

  const loadAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const data = await requestJson('/consultations');
      const list = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
      setAppointments(list);
    } catch (err) {
      setFlash('Skipping appointments fetch: ' + err.message);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    // load appointments when component mounts
    loadAppointments();
  }, []);

  const submitAppointment = async (e) => {
    e.preventDefault();
    if (!appointmentDraft.animalId || !appointmentDraft.appointment_date) {
      setFlash('Animal and appointment date/time are required');
      return;
    }

    try {
      await requestJson('/consultations', { method: 'POST', body: JSON.stringify({
        animalId: appointmentDraft.animalId,
        appointment_date: appointmentDraft.appointment_date,
        symptoms: appointmentDraft.symptoms,
      }) });
      setFlash('Appointment requested.');
      setAppointmentDraft({ animalId: '', appointment_date: '', symptoms: '' });
      await loadAppointments();
    } catch (err) {
      setFlash('Unable to request appointment: ' + err.message);
    }
  };

  const submitStaff = async (event) => {
    event.preventDefault();
    try {
      await requestJson("/users", {
        method: "POST",
        body: JSON.stringify({
          name: staffDraft.name,
          farmerId: staffDraft.farmerId,
          password: staffDraft.password,
          role: staffDraft.role,
          phone: staffDraft.phone,
          status: staffDraft.status,
        }),
      });
      setStaffDraft({
        name: "",
        farmerId: "",
        password: "",
        role: "Staff",
        phone: "",
        status: "Active",
        joined: today(),
      });
      setFlash("User saved successfully.");
      await loadUsers();
    } catch (error) {
      setFlash(`Unable to save user: ${error.message}`);
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

      <SectionCard title="Doctor Consultations">
        {(() => {
          const consultations = [
            { id: 1, farmer: "Raju Shetty", animal: "Bella", urgency: "Critical", symptom: "Fever, reduced feed intake, and swollen hind leg." },
            { id: 2, farmer: "Anitha Kumar", animal: "Moti", urgency: "Moderate", symptom: "Cough, mild discharge, and lower milk yield." },
            { id: 3, farmer: "Naveen Rao", animal: "Daisy", urgency: "Normal", symptom: "Loose stool and dehydration signs." },
          ];

          const urgencyClass = (value) => {
            const normalized = String(value || "").toLowerCase();
            if (normalized === "critical") return "tag tag-red";
            if (normalized === "moderate") return "tag tag-amber";
            if (normalized === "normal") return "tag tag-green";
            return "tag tag-blue";
          };

          return (
            <div className="grid gap-3">
              {consultations.map((c) => (
                <div key={c.id} className="consult-row">
                  <div className="consult-main">
                    <div style={{ fontWeight: 600 }}>{c.farmer} — {c.animal}</div>
                    <div className="text-sm text-muted">{c.symptom}</div>
                  </div>
                  <div className="consult-actions">
                    <span className={urgencyClass(c.urgency)}>{c.urgency}</span>
                    {String(currentUser?.role || "").toLowerCase() === 'doctor' || isAdmin ? (
                      <button className="btn btn-primary" type="button" onClick={() => setActiveTab?.('doctor')}>Open</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
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
          {visibleAnimals.length ? (
            visibleAnimals.slice(0, 5).map((animal) => {
              const riskLabel = getDiseaseRisk(animal);
              const riskDetails = getDiseaseRiskDetails(animal);
                  const appForAnimal = appointments.find((a) => String(a.animalId) === String(animal._id) && (a.status === 'pending' || !a.status));

              return (
                <div key={animal._id} className="animal-card">
                  <div className="row-item">
                    <div className="row-icon"><AnimalAvatar animal={animal} /></div>
                    <div className="row-main">
                      <strong>{animal.name}</strong>
                      <span>{getAnimalSpecies(animal)} {animal.pen ? `• ${animal.pen}` : ""}</span>
                    </div>
                    <div className="row-tags">
                      <span className={`temp-chip temp-${getTemperatureState(parseTemperature(animal))}`}>{formatTemperature(parseTemperature(animal))}</span>
                      {appForAnimal ? (
                        <div style={{ marginLeft: 8 }}>
                          <span className="tag tag-blue">Consult: {timeUntil(appForAnimal.appointment_date || appForAnimal.createdAt)}</span>
                        </div>
                      ) : null}
                      <div className="risk-stack">
                        <StatusTag value={riskLabel} />
                        <small className={`risk-note ${riskLabel === "Normal" ? "risk-note-good" : ""}`}>
                          {getJudgeNote(riskLabel, riskDetails)}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">No animals match your search.</div>
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
              {!isAdmin ? (
                <div className="hint-box">Only administrators can register new animals. Read-only access for your account.</div>
              ) : null}
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
              <div className="animal-photo-field">
                <div className="fl">Profile Picture</div>
                <div className="photo-upload-row">
                  <div className="photo-preview">
                    {animalPhotoPreview ? (
                      <img src={animalPhotoPreview} alt="Selected animal" />
                    ) : (
                      <span>No photo selected</span>
                    )}
                  </div>
                  <div className="photo-upload-controls">
                    <input className="fi" type="file" accept="image/*" onChange={handleAnimalPhotoChange} />
                    <div className="photo-note">PNG or JPG only, up to 5MB.</div>
                    <button className="btn btn-outline" type="button" onClick={clearAnimalPhoto} disabled={!animalPhotoFile}>
                      Clear Photo
                    </button>
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={!isAdmin}>
                <Plus size={14} /> Register Animal
              </button>
            </form>
          </SectionCard>
        ) : (
          <SectionCard title="Animal List">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" onChange={(e) => {
                  if (e.target.checked) setSelectedIds(new Set(visibleAnimals.map(a => String(a._id))));
                  else setSelectedIds(new Set());
                }} checked={visibleAnimals.length > 0 && selectedIds.size === visibleAnimals.length} />
                <span>✓ Select All Animals</span>
              </label>
              <button className="btn btn-primary" type="button" onClick={async () => {
                if (!selectedIds.size) { setFlash('No animals selected'); return; }
                const vaccineType = window.prompt('Vaccine name to apply to selected animals', 'FMD');
                if (!vaccineType) return;
                try {
                  for (const id of Array.from(selectedIds)) {
                    await requestJson('/vaccinations', { method: 'POST', body: JSON.stringify({ animalId: id, vaccineType, dueDate: new Date().toISOString(), status: 'done', batchNumber: 'FMD-2026-0458' }) });
                  }
                  setFlash('Vaccination recorded for selected animals');
                  await loadData?.();
                } catch (err) { setFlash('Vaccination failed: ' + err.message); }
              }}>
                Vaccinate Selected
              </button>

              <button className="btn btn-outline" type="button" onClick={async () => {
                if (!selectedIds.size) { setFlash('No animals selected'); return; }
                const pasture = window.prompt('Move selected animals to pasture (name)', 'Pasture A');
                if (!pasture) return;
                try {
                  for (const id of Array.from(selectedIds)) {
                    await requestJson(`/animals/${id}`, { method: 'PATCH', body: JSON.stringify({ pen: pasture }) });
                  }
                  setFlash('Selected animals moved to ' + pasture);
                  await loadData?.();
                } catch (err) { setFlash('Move failed: ' + err.message); }
              }}>Move to Pasture</button>

              <button className="btn btn-outline" type="button" onClick={() => {
                if (!selectedIds.size) { setFlash('No animals selected'); return; }
                const rows = [["Photo","Name/ID","Breed","Age","Weight","Health","Last Milk","Last Fed","Next Vaccine","Pen","Tag"]];
                for (const id of Array.from(selectedIds)) {
                  const a = animalsById.get(String(id));
                  rows.push([
                    a?.photoUrl || a?.imageUrl || '',
                    a?.name || '',
                    a?.breed || '',
                    a?.dob ? Math.floor((Date.now() - new Date(a.dob).getTime())/(1000*60*60*24*30)) + ' months' : '',
                    a?.weight || '',
                    a?.status || '',
                    a?.lastMilk || '',
                    a?.lastFed || '',
                    (() => { const next = vaccinations.find(v => String(v.animalId) === String(id) && v.dueDate); return next ? `${next.vaccineType || next.vaccine} - ${next.dueDate}` : ''; })(),
                    a?.pen || '',
                    a?.tag || ''
                  ]);
                }
              }}> 
              </button>

              <button className="btn btn-outline" type="button" onClick={() => {
                if (!selectedIds.size) { setFlash('No animals selected'); return; }
                const win = window.open('', '_blank');
                if (!win) { setFlash('Unable to open print window'); return; }
                win.document.write('<html><head><title>Print Tags</title></head><body>');
                for (const id of Array.from(selectedIds)) {
                  const a = animalsById.get(String(id));
                  win.document.write(`<div style="page-break-inside:avoid;border:1px solid #ccc;padding:8px;margin:8px;display:inline-block;min-width:200px;">`);
                  win.document.write(`<div><strong>${a?.name || ''}</strong></div>`);
                  win.document.write(`<div>Tag: ${a?.tag || ''}</div>`);
                  win.document.write(`<div>Breed: ${a?.breed || ''}</div>`);
                  win.document.write(`</div>`);
                }
                win.document.write('</body></html>');
                win.document.close();
                win.focus();
                win.print();
              }}>Print Tags</button>

              <button className="btn btn-outline" type="button" onClick={() => setGroupByBreed((g) => !g)}>{groupByBreed ? 'Ungroup' : 'Group by Breed'}</button>
            </div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th></th>
                    <th>Photo</th>
                    <th>Name/ID</th>
                    <th>Breed</th>
                    <th>Age</th>
                    <th>Weight</th>
                    <th>Health</th>
                    <th>Last Milk</th>
                    <th>Last Fed</th>
                    <th>Next Vaccine</th>
                    <th>Temperature</th>
                    <th>Disease Risk</th>
                    <th>Pen</th>
                    <th>Tag</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAnimals.length ? visibleAnimals.map((animal) => (
                    (() => {
                      const riskLabel = getDiseaseRisk(animal);
                      const riskDetails = getDiseaseRiskDetails(animal);

                      return (
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
                      <td>
                        <div className="risk-stack">
                          <StatusTag value={riskLabel} />
                          <small className={`risk-note ${riskLabel === "Normal" ? "risk-note-good" : ""}`}>
                            {getJudgeNote(riskLabel, riskDetails)}
                          </small>
                        </div>
                      </td>
                      <td>{animal.pen || "—"}</td>
                      <td><code className="inline-code">{animal.tag || "—"}</code></td>
                      <td><StatusTag value={animal.status || "Healthy"} /></td>
                    </tr>
                      );
                    })()
                  )) : (
                    <tr>
                      <td colSpan="10">
                        <div className="empty-state">No animals match your search.</div>
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

        <SectionCard title="Doctor Consultations">
          {(() => {
            const consultations = [
              { id: 1, farmer: "Raju Shetty", animal: "Bella", urgency: "Critical", symptom: "Fever, reduced feed intake, and swollen hind leg." },
              { id: 2, farmer: "Anitha Kumar", animal: "Moti", urgency: "Moderate", symptom: "Cough, mild discharge, and lower milk yield." },
              { id: 3, farmer: "Naveen Rao", animal: "Daisy", urgency: "Normal", symptom: "Loose stool and dehydration signs." },
            ];

            const urgencyClass = (value) => {
              const normalized = String(value || "").toLowerCase();
              if (normalized === "critical") return "tag tag-red";
              if (normalized === "moderate") return "tag tag-amber";
              if (normalized === "normal") return "tag tag-green";
              return "tag tag-blue";
            };

            return (
              <div className="grid gap-3">
                {consultations.map((c) => (
                  <div key={c.id} className="consult-row">
                    <div className="consult-main">
                      <div style={{ fontWeight: 600 }}>{c.farmer} — {c.animal}</div>
                      <div className="text-sm text-muted">{c.symptom}</div>
                    </div>
                    <div className="consult-actions">
                      <span className={urgencyClass(c.urgency)}>{c.urgency}</span>
                      {String(currentUser?.role || "").toLowerCase() === 'doctor' || isAdmin ? (
                        <button className="btn btn-primary" type="button" onClick={() => setActiveTab?.('doctor')}>Open</button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </SectionCard>

        {healthTab === "vacc" ? (
          <>
            <SectionCard title="Log Vaccination" action={<span className="tag tag-blue">{pendingVaccinations.length} pending</span>}>
              {!isAdmin ? (
                <div className="hint-box">Only administrators can add or change vaccination records.</div>
              ) : null}
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
                <button className="btn btn-primary" type="submit" disabled={!isAdmin}>
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
              {!isAdmin ? (
                <div className="hint-box">Only administrators can add treatment records.</div>
              ) : null}
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
                <button className="btn btn-primary" type="submit" disabled={!isAdmin}>
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
              {!isAdmin ? (
                <div className="hint-box">Only administrators can add or edit feeders.</div>
              ) : null}
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
                <button className="btn btn-primary" type="submit" disabled={!isAdmin}>
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
              {!isAdmin ? (
                <div className="hint-box">Only administrators can log consumption. Contact an admin to record feed logs.</div>
              ) : null}
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
                <button className="btn btn-primary" type="submit" disabled={!isAdmin}>
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

        <SectionCard title="Doctor Appointments">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <form className="form-grid" onSubmit={submitAppointment}>
                <label className="fg">
                  <span className="fl">Animal *</span>
                  <select className="fs" value={appointmentDraft.animalId} onChange={(e) => setAppointmentDraft((c) => ({ ...c, animalId: e.target.value }))} required>
                    <option value="">Select...</option>
                    {animals.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                </label>
                <label className="fg">
                  <span className="fl">Date & Time *</span>
                  <input className="fi" type="datetime-local" value={appointmentDraft.appointment_date} onChange={(e) => setAppointmentDraft((c) => ({ ...c, appointment_date: e.target.value }))} required />
                </label>
                <label className="fg">
                  <span className="fl">Symptoms / Notes</span>
                  <input className="fi" value={appointmentDraft.symptoms} onChange={(e) => setAppointmentDraft((c) => ({ ...c, symptoms: e.target.value }))} placeholder="Brief description" />
                </label>
                <div>
                  <button className="btn btn-primary" type="submit">Request Appointment</button>
                </div>
              </form>
            </div>

            <div style={{ flex: 1 }}>
              <div className="stack-gap">
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Upcoming Appointments</div>
                {loadingAppointments ? <div>Loading...</div> : (
                  appointments.length ? appointments.map((app) => (
                    <div key={app._id} className="rounded-2xl border p-3">
                      <div style={{ fontWeight: 600 }}>{app.animal ? app.animal.name : 'Unknown animal'}</div>
                      <div style={{ fontSize: 12 }}>{app.symptoms}</div>
                      <div style={{ marginTop: 6 }}><small>{app.appointment_date ? new Date(app.appointment_date).toLocaleString() : (app.createdAt ? new Date(app.createdAt).toLocaleString() : 'Requested')}</small></div>
                      <div style={{ marginTop: 6 }}>
                        <small>Delay: {timeUntil(app.appointment_date || app.createdAt)}</small>
                      </div>
                      <div style={{ marginTop: 6 }}><span className={`tag tag-${toneForStatus(app.status)}`}>{app.status || 'pending'}</span></div>
                    </div>
                  )) : <div className="empty-state">No appointments found.</div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </>
    );
  };

  const renderReports = () => (
    <div className="report-grid">
      <div className="report-card report-alerts">
        <div className="report-head">
          <strong>Feed Alerts</strong>
          <span>Animals with low intake or not fed recently</span>
        </div>
        <div className="report-body">
          {animals && animals.length ? (
            (() => {
              const alerts = animals.filter(isFeedAlert);
              if (!alerts.length) return <div className="empty-state">No feed alerts</div>;
              return (
                <div className="alerts-list">
                  {alerts.map((a) => {
                    const level = feedLevelNumeric(a);
                    const lastFed = a.lastFed || a.last_fed || a.lastFeed || null;
                    const days = daysSince(lastFed);
                    const reason = String(a.feedIntake || '').toLowerCase();
                    const values = level != null ? [Math.max(0, level - 8), Math.max(0, level - 3), level] : [0, 10, 20];
                    return (
                      <div className="alert-row" key={a._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px dashed #eee'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6,background:'#fafafa',border:'1px solid #eee'}}>{animalEmoji(a.type || a.species)}</div>
                          <div>
                            <div style={{fontWeight:600}}>{a.name || a.tag || a._id}</div>
                            <div style={{fontSize:12,color:'#666'}}>{reason || (days === Infinity ? 'No feed data' : `${days}d since fed`)}</div>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <Sparkline values={values} />
                          <div style={{fontSize:12,color:'#333'}}>{level != null ? `${level}%` : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div className="empty-state">No animals data</div>
          )}
        </div>
      </div>
      <div className="report-card">
        <div className="report-head">
          <strong>Herd Report</strong>
          <span>Animals and status</span>
        </div>
        <div className="report-actions">
          {/* Exports removed — show graphs/alerts only */}
        </div>
      </div>

      <div className="report-card">
        <div className="report-head">
          <strong>Vaccination Report</strong>
          <span>History and pending</span>
        </div>
        <div className="report-actions">{/* Exports removed — show graphs/alerts only */}</div>
      </div>

      <div className="report-card">
        <div className="report-head">
          <strong>Health Report</strong>
          <span>Treatment records</span>
        </div>
        <div className="report-actions">{/* Exports removed — show graphs/alerts only */}</div>
      </div>

      <div className="report-card">
        <div className="report-head">
          <strong>Feed Report</strong>
          <span>Inventory and consumption</span>
        </div>
        <div className="report-actions">{/* Exports removed — show graphs/alerts only */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[7, 14, 30].map((d) => (
                <button key={d} type="button" className={`btn ${reportRange === d ? 'btn-primary' : 'btn-outline'}`} onClick={() => setReportRange(d)}>{d}d</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <ReportChart feedLogs={feedLogs} days={reportRange} />
          </div>
        </div>
      </div>

      <div className="report-card report-card-wide">
        <div className="report-head">
          <strong>Full Operations Pack</strong>
          <span>Overview and dashboards</span>
        </div>
        <div className="report-actions">{/* Full operations export removed — show graphs/alerts only */}</div>
      </div>
    </div>
  );

  const renderStaff = () => (
    <>
      {isAdmin ? (
        <SectionCard title="All Users">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Farmer ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan="5">Loading users...</td></tr>
                ) : usersList.length ? usersList.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.farmerId || '-'}</td>
                    <td>{u.role || 'Staff'}</td>
                    <td>{u.status || 'Active'}</td>
                    <td>
                      {String(u.role || '').toLowerCase() !== 'admin' ? (
                        <button className="btn btn-outline" type="button" onClick={async () => {
                          try {
                            await requestJson(`/users/${u._id}/role`, { method: 'POST', body: JSON.stringify({ role: 'Admin' }) });
                            setFlash(`Promoted ${u.farmerId || u.name} to Admin.`);
                            await loadUsers();
                          } catch (err) {
                            setFlash('Promotion failed: ' + err.message);
                          }
                        }}>Promote to Admin</button>
                      ) : (<span className="tag tag-blue">Admin</span>)}
                      <button
                        className="btn btn-danger"
                        type="button"
                        style={{ marginLeft: 8 }}
                        disabled={String(currentUser?._id) === String(u._id)}
                        onClick={async () => {
                          try {
                            await requestJson(`/users/${u._id}`, { method: 'DELETE' });
                            setFlash(`Removed ${u.farmerId || u.name}.`);
                            await loadUsers();
                          } catch (err) {
                            setFlash('Remove failed: ' + err.message);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5"><div className="empty-state">No users found.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
      <SectionCard title="Add New User">
        {!isAdmin ? (
          <div className="hint-box">Only administrators can create or modify user accounts.</div>
        ) : (
        <form className="form-grid" onSubmit={submitStaff}>
          <label className="fg">
            <span className="fl">Name *</span>
            <input className="fi" value={staffDraft.name} onChange={(event) => setStaffDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Full Name" required />
          </label>
          <label className="fg">
            <span className="fl">Farmer ID *</span>
            <input className="fi" value={staffDraft.farmerId} onChange={(event) => setStaffDraft((current) => ({ ...current, farmerId: event.target.value }))} placeholder="e.g. farmer007" required />
          </label>
          <label className="fg">
            <span className="fl">Role</span>
            <select className="fs" value={staffDraft.role} onChange={(event) => setStaffDraft((current) => ({ ...current, role: event.target.value }))}>
              <option>Admin</option>
              <option>Doctor</option>
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
            <span className="fl">Password</span>
            <input className="fi" type="password" value={staffDraft.password} onChange={(event) => setStaffDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Set password for farmer" />
          </label>
          <label className="fg">
            <span className="fl">Phone</span>
            <input className="fi" value={staffDraft.phone} onChange={(event) => setStaffDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Contact number" />
          </label>
          <button className="btn btn-primary" type="submit" disabled={!isAdmin}>
            <Plus size={14} /> Add User
          </button>
        </form>
        )}
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

  const renderDoctor = () => {
    const consultations = [
      {
        id: 1,
        farmer: "Raju Shetty",
        animal: "Bella",
        urgency: "Critical",
        symptom: "Fever, reduced feed intake, and swollen hind leg.",
      },
      {
        id: 2,
        farmer: "Anitha Kumar",
        animal: "Moti",
        urgency: "Moderate",
        symptom: "Cough, mild discharge, and lower milk yield.",
      },
      {
        id: 3,
        farmer: "Naveen Rao",
        animal: "Daisy",
        urgency: "Normal",
        symptom: "Loose stool and dehydration signs.",
      },
    ];

    const patients = [
      { name: "Bella", status: "Stable", weight: "420 kg" },
      { name: "Moti", status: "Watch", weight: "510 kg" },
      { name: "Daisy", status: "Recovering", weight: "390 kg" },
    ];

    const urgencyClass = (value) => {
      const normalized = String(value || "").toLowerCase();
      if (normalized === "critical") return "tag tag-red";
      if (normalized === "moderate") return "tag tag-amber";
      if (normalized === "normal") return "tag tag-green";
      return "tag tag-blue";
    };

    return (
      <div className="space-y-4">
        <SectionCard title="Doctor dashboard" action={<span className="tag tag-blue">Floating module</span>}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <MetricCard label="Pending Consultations" value="5" sublabel="Awaiting review" tone="red" />
            <MetricCard label="Today's Appointments" value="8" sublabel="Scheduled today" tone="blue" />
            <MetricCard label="Total Patients" value="120" sublabel="Assigned to doctor" tone="green" />
            <MetricCard label="Average Rating" value="4.8⭐" sublabel="Latest feedback" tone="amber" />
          </div>
        </SectionCard>

        <SectionCard title="Recent consultations">
          <div className="grid gap-3">
            {consultations.map((consultation) => (
              <div key={consultation.id} className="rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-semibold text-[var(--gray-800)]">{consultation.farmer}</div>
                    <div className="mt-1 text-sm text-[var(--gray-600)]">{consultation.animal}</div>
                    <p className="mt-2 max-w-3xl text-sm text-[var(--gray-600)]">{consultation.symptom}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={urgencyClass(consultation.urgency)}>{consultation.urgency}</span>
                    <button type="button" className="btn btn-primary">View Details</button>
                    { (String(currentUser?.role || '').toLowerCase() === 'doctor' || isAdmin) ? (
                      <> 
                        <button type="button" className="btn btn-success" onClick={() => {
                          // toggle diagnosis form
                          setDiagnosisDrafts((d) => ({ ...d, [consultation._id || consultation.id]: d[consultation._id || consultation.id] ? undefined : { diagnosis: '', medicine_name: '', dosage: '', frequency: '', duration_days: 7 } }));
                        }}>Add Diagnosis</button>
                      </>
                    ) : null}
                  </div>
                  {diagnosisDrafts[consultation._id || consultation.id] ? (
                    <form className="mt-3" onSubmit={async (e) => {
                      e.preventDefault();
                      const key = consultation._id || consultation.id;
                      const draft = diagnosisDrafts[key];
                      setProcessingDiagnosis((p) => ({ ...p, [key]: true }));
                      try {
                        await requestJson(`/consultations/${consultation._id || consultation.id}/prescription`, {
                          method: 'POST',
                          body: JSON.stringify({
                            diagnosis: draft.diagnosis,
                            prescription: [{ medicine_name: draft.medicine_name, dosage: draft.dosage, frequency: draft.frequency, duration_days: Number(draft.duration_days) }],
                            status: 'completed'
                          })
                        });
                        setFlash('Prescription saved');
                        setDiagnosisDrafts((d) => { const copy = { ...d }; delete copy[key]; return copy; });
                        await loadAppointments();
                      } catch (err) {
                        setFlash('Unable to save prescription: ' + err.message);
                      } finally {
                        setProcessingDiagnosis((p) => ({ ...p, [key]: false }));
                      }
                    }}>
                      <label className="fg"><span className="fl">Diagnosis</span><input className="fi" value={diagnosisDrafts[consultation._id || consultation.id].diagnosis} onChange={(e)=> setDiagnosisDrafts((d)=>({ ...d, [consultation._id||consultation.id]: { ...d[consultation._id||consultation.id], diagnosis: e.target.value } }))} required /></label>
                      <label className="fg"><span className="fl">Medicine</span><input className="fi" value={diagnosisDrafts[consultation._id || consultation.id].medicine_name} onChange={(e)=> setDiagnosisDrafts((d)=>({ ...d, [consultation._id||consultation.id]: { ...d[consultation._id||consultation.id], medicine_name: e.target.value } }))} required /></label>
                      <label className="fg"><span className="fl">Dosage</span><input className="fi" value={diagnosisDrafts[consultation._id || consultation.id].dosage} onChange={(e)=> setDiagnosisDrafts((d)=>({ ...d, [consultation._id||consultation.id]: { ...d[consultation._id||consultation.id], dosage: e.target.value } }))} /></label>
                      <label className="fg"><span className="fl">Frequency</span><input className="fi" value={diagnosisDrafts[consultation._id || consultation.id].frequency} onChange={(e)=> setDiagnosisDrafts((d)=>({ ...d, [consultation._id||consultation.id]: { ...d[consultation._id||consultation.id], frequency: e.target.value } }))} /></label>
                      <label className="fg"><span className="fl">Duration (days)</span><input className="fi" type="number" value={diagnosisDrafts[consultation._id || consultation.id].duration_days} onChange={(e)=> setDiagnosisDrafts((d)=>({ ...d, [consultation._id||consultation.id]: { ...d[consultation._id||consultation.id], duration_days: e.target.value } }))} /></label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" type="submit" disabled={processingDiagnosis[consultation._id || consultation.id]}>Save</button>
                        <button className="btn btn-outline" type="button" onClick={() => setDiagnosisDrafts((d)=>{ const c={...d}; delete c[consultation._id||consultation.id]; return c; })}>Cancel</button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="My patients">
            <div className="grid gap-3 md:grid-cols-3">
              {patients.map((patient) => (
                <div key={patient.name} className="rounded-2xl border border-[var(--gray-200)] bg-white p-4 shadow-sm">
                  <div className="font-semibold text-[var(--gray-800)]">{patient.name}</div>
                  <div className="mt-1 text-sm text-[var(--gray-600)]">Last weight: {patient.weight}</div>
                  <div className="mt-2"><StatusTag value={patient.status} /></div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Analytics">
            <div className="rounded-2xl border border-[var(--gray-200)] bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-[var(--gray-600)]">Disease distribution</div>
              <div className="space-y-3">
                {[
                  ["FMD", 30],
                  ["Mastitis", 25],
                  ["Diarrhea", 20],
                  ["Others", 25],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{label}</span>
                      <span>{value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--gray-100)]">
                      <div className="h-2 rounded-full bg-gradient-to-r from-[var(--green-500)] to-[var(--blue-500)]" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  };

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
      case "doctor":
        return renderDoctor();
      case "staff":
        return renderStaff();
      case "settings":
        return renderSettings();
      case "overview":
      default:
        return renderOverview();
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'livestock', label: 'Livestock', icon: Users },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'feeding', label: 'Feeding', icon: Coffee },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    // show Doctor dashboard only to Doctor users or Admins
    ...(String(currentUser?.role || '').toLowerCase() === 'doctor' || isAdmin
      ? [{ id: 'doctor', label: 'Doctor', icon: Syringe }]
      : []),
    { id: 'staff', label: 'Staff', icon: UserPlus },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
          {menuItems.map((item) => {
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
            <label className="topbar-search" aria-label="Search animals">
              <Search size={14} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm?.(event.target.value)}
                placeholder="Search animals, tags, pens"
              />
            </label>
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