import { useEffect, useMemo, useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Activity,
  AlertTriangle,
  Users,
  Settings,
  LogOut,
  Home,
  Heart,
  Syringe,
  Zap,
  FileText,
  UserCheck,
  Bell,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Thermometer,
  Droplets,
  Target,
  Calendar,
  Shield,
  Brain,
  MessageSquare,
  Moon,
  Sun,
} from "lucide-react";
import ProtectedRoute from "./ProtectedRoute";
import AuthView from "./AuthView";
import DashboardView from "./DashboardView";
import { NotificationToaster } from "./NotificationToast";
import { useAlerts, showNotification } from "./notifications";

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

const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const sidebarItems = [
  { id: "overview", label: "Dashboard", icon: Home },
  { id: "livestock", label: "Livestock Inventory", icon: Activity },
  { id: "health", label: "Health & Medical", icon: Heart },
  { id: "vaccination", label: "Vaccination Tracking", icon: Syringe },
  { id: "feeding", label: "Feeder Management", icon: Zap },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
  { id: "staff", label: "Staff Management", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

const pageTitles = {
  overview: "Home Dashboard",
  livestock: "Livestock Inventory",
  health: "Health & Medical",
  vaccination: "Vaccination Tracking",
  feeding: "Feeder Management",
  reports: "Reports & Analytics",
  staff: "Staff Management",
  notifications: "Notifications",
  settings: "System Settings",
};

const formatDateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

const requestJson = async (url, options = {}) => {
  const tokenLocal = localStorage.getItem("authToken");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {}),
  };

  const fullUrl = `${API_BASE}${url}`;

  const response = await fetch(fullUrl, { ...options, headers });

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
  const [vaccinations, setVaccinations] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [animalForm, setAnimalForm] = useState(emptyAnimal);
  const [feederForm, setFeederForm] = useState(emptyFeeder);
  const [feedLogForm, setFeedLogForm] = useState(emptyFeedLog);
  const [vaccinationForm, setVaccinationForm] = useState({ animalId: "", vaccineType: "", dueDate: "", status: "pending" });
  const [healthForm, setHealthForm] = useState({ animalId: "", condition: "", symptoms: "", treatment: "", date: "" });
  const [staffForm, setStaffForm] = useState({ name: "", role: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [dashboardMessage, setDashboardMessage] = useState("Loading farm data...");
  const [savingAnimal, setSavingAnimal] = useState(false);
  const [savingFeeder, setSavingFeeder] = useState(false);
  const [savingFeedLog, setSavingFeedLog] = useState(false);
  const [savingVaccination, setSavingVaccination] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const isAuthenticated = Boolean(token);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Load alerts from backend
  useAlerts();

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        animalsData,
        feedersData,
        feedLogsData,
        vaccinationsData,
        healthData,
        staffData,
        notificationsData
      ] = await Promise.all([
        requestJson("/api/animals"),
        requestJson("/api/feeders"),
        requestJson("/api/feeds"),
        requestJson("/api/vaccinations").catch(() => []),
        requestJson("/api/health").catch(() => []),
        requestJson("/api/staff").catch(() => []),
        requestJson("/api/notifications").catch(() => [])
      ]);

      setAnimals(animalsData);
      setFeeders(feedersData);
      setFeedLogs(feedLogsData);
      setVaccinations(vaccinationsData);
      setHealthRecords(healthData);
      setStaff(staffData);
      setNotifications(notificationsData);
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
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    loadData();
  }, [isAuthenticated, loadData]);

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

  // New computed values
  const healthyAnimals = animals.length - healthRecords.filter(record => record.condition === 'sick').length;
  const pendingVaccinations = vaccinations.filter(vac => vac.status === 'pending').length;
  const speciesDistribution = animals.reduce((acc, animal) => {
    acc[animal.type] = (acc[animal.type] || 0) + 1;
    return acc;
  }, {});
  const healthStatusData = [
    { name: 'Healthy', value: healthyAnimals, color: '#10b981' },
    { name: 'Sick', value: animals.length - healthyAnimals, color: '#ef4444' }
  ];

  const speciesData = Object.entries(speciesDistribution).map(([type, count], index) => {
    const percent = animals.length ? Math.round((count / animals.length) * 100) : 0;
    const colors = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#0ea5e9'];
    return {
      label: type || 'Unknown',
      value: count,
      percent,
      color: colors[index % colors.length],
    };
  });

  const speciesChartBackground = animals.length
    ? `conic-gradient(${speciesData
        .map((entry, index) => {
          const start = speciesData.slice(0, index).reduce((sum, item) => sum + item.percent, 0);
          const end = start + entry.percent;
          return `${entry.color} ${start}% ${end}%`;
        })
        .join(', ')})`
    : 'rgba(148, 163, 184, 0.25)';

  const alerts = [
    ...feeders
      .filter((feeder) => Number(feeder.feedLevel) < 30)
      .map((feeder) => ({
        type: "Low feed level",
        detail: `${feeder.location || "Unknown feeder"} is below 30%`,
        tone: "warning",
        icon: AlertTriangle,
      })),
    ...feeders
      .filter((feeder) => feeder.status === "Offline")
      .map((feeder) => ({
        type: "Feeder offline",
        detail: `${feeder.location || "Unknown feeder"} is offline`,
        tone: "danger",
        icon: XCircle,
      })),
    ...feedLogs
      .filter((log) => Number(log.quantity) > 35)
      .map((log) => ({
        type: "High feed usage",
        detail: `${log.animal?.name || "Animal"} consumed ${log.quantity} units`,
        tone: "info",
        icon: TrendingUp,
      })),
    ...vaccinations
      .filter((vac) => new Date(vac.dueDate) < new Date() && vac.status === 'pending')
      .map((vac) => ({
        type: "Overdue vaccination",
        detail: `${vac.animal?.name || "Animal"} needs ${vac.vaccineType}`,
        tone: "danger",
        icon: Syringe,
      })),
    ...healthRecords
      .filter((record) => record.condition === 'critical')
      .map((record) => ({
        type: "Critical health issue",
        detail: `${record.animal?.name || "Animal"} requires immediate attention`,
        tone: "danger",
        icon: Heart,
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

  const handleAnimalChange = useCallback((event) => {
    const { name, value } = event.target;
    setAnimalForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleFeederChange = useCallback((event) => {
    const { name, value } = event.target;
    setFeederForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleFeedLogChange = useCallback((event) => {
    const { name, value } = event.target;
    setFeedLogForm((current) => ({ ...current, [name]: value }));
  }, []);

  const createAnimal = useCallback(async (event) => {
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
      showNotification(`Added animal ${animalForm.name.trim() || "record"}.`, "success");
    } catch (error) {
      setDashboardMessage(`Unable to save animal: ${error.message}`);
      showNotification(`Unable to save animal: ${error.message}`, "error");
    } finally {
      setSavingAnimal(false);
    }
  }, [animalForm, loadData]);

  const createFeeder = useCallback(async (event) => {
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
      showNotification(`Saved feeder ${feederForm.location.trim() || "settings"}.`, "success");
    } catch (error) {
      setDashboardMessage(`Unable to save feeder: ${error.message}`);
      showNotification(`Unable to save feeder: ${error.message}`, "error");
    } finally {
      setSavingFeeder(false);
    }
  }, [feederForm, loadData]);

  const createFeedLog = useCallback(async (event) => {
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
      showNotification("Added feeding record.", "success");
    } catch (error) {
      setDashboardMessage(`Unable to save feeding record: ${error.message}`);
      showNotification(`Unable to save feeding record: ${error.message}`, "error");
    } finally {
      setSavingFeedLog(false);
    }
  }, [feedLogForm, loadData]);

  const updateFeederStatus = useCallback(async (feeder, status) => {
    try {
      await requestJson(`/api/feeders/${feeder._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          feedLevel: status === "Active" ? Math.min(100, Number(feeder.feedLevel || 0) + 6) : feeder.feedLevel,
        }),
      });

      await loadData();
      showNotification(`Feeder updated to ${status}.`, "success");
    } catch (error) {
      setDashboardMessage(`Unable to update feeder: ${error.message}`);
      showNotification(`Unable to update feeder: ${error.message}`, "error");
    }
  }, [loadData]);

  const navigate = useNavigate();

  const handleLogoutAndRedirect = useCallback(() => {
    setToken("");
    setCurrentUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    navigate("/login", { replace: true });
  }, [navigate]);

  const handleVaccinationChange = useCallback((event) => {
    const { name, value } = event.target;
    setVaccinationForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleHealthChange = useCallback((event) => {
    const { name, value } = event.target;
    setHealthForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleStaffChange = useCallback((event) => {
    const { name, value } = event.target;
    setStaffForm((current) => ({ ...current, [name]: value }));
  }, []);

  const createVaccination = useCallback(async (event) => {
    event.preventDefault();
    setSavingVaccination(true);
    try {
      await requestJson("/api/vaccinations", {
        method: "POST",
        body: JSON.stringify(vaccinationForm),
      });
      setVaccinationForm({ animalId: "", vaccineType: "", dueDate: "", status: "pending" });
      await loadData();
      showNotification("Vaccination scheduled.", "success");
    } catch (error) {
      setDashboardMessage(`Unable to save vaccination: ${error.message}`);
      showNotification(`Unable to save vaccination: ${error.message}`, "error");
    } finally {
      setSavingVaccination(false);
    }
  }, [vaccinationForm, loadData]);

  const createHealthRecord = useCallback(async (event) => {
    event.preventDefault();
    setSavingHealth(true);
    try {
      await requestJson("/api/health", {
        method: "POST",
        body: JSON.stringify(healthForm),
      });
      setHealthForm({ animalId: "", condition: "", symptoms: "", treatment: "", date: "" });
      await loadData();
      showNotification("Health record saved.", "success");
    } catch (error) {
      setDashboardMessage(`Unable to save health record: ${error.message}`);
      showNotification(`Unable to save health record: ${error.message}`, "error");
    } finally {
      setSavingHealth(false);
    }
  }, [healthForm, loadData]);

  const createStaff = useCallback(async (event) => {
    event.preventDefault();
    setSavingStaff(true);
    try {
      await requestJson("/api/staff", {
        method: "POST",
        body: JSON.stringify(staffForm),
      });
      setStaffForm({ name: "", role: "", email: "", phone: "" });
      await loadData();
      showNotification("Staff member added.", "success");
    } catch (error) {
      setDashboardMessage(`Unable to save staff member: ${error.message}`);
      showNotification(`Unable to save staff member: ${error.message}`, "error");
    } finally {
      setSavingStaff(false);
    }
  }, [staffForm, loadData]);

  const dashboardProps = useMemo(
    () => ({
      currentUser,
      activeTab,
      setActiveTab,
      handleLogoutAndRedirect,
      pageTitles,
      loadData,
      dashboardMessage,
      loading,
      animals,
      speciesData,
      speciesChartBackground,
      weeklyUsage,
      maxWeeklyUsage,
      healthStatusData,
      alerts,
      speciesDistribution,
      searchTerm,
      setSearchTerm,
      filterType,
      setFilterType,
      createAnimal,
      animalForm,
      handleAnimalChange,
      savingAnimal,
      feeders,
      createFeeder,
      feederForm,
      handleFeederChange,
      savingFeeder,
      updateFeederStatus,
      feedLogs,
      monthlyFeedCost,
      performanceScore,
      staff,
      createStaff,
      staffForm,
      handleStaffChange,
      savingStaff,
      vaccinations,
      createVaccination,
      vaccinationForm,
      handleVaccinationChange,
      savingVaccination,
      animalsById,
      healthRecords,
      systemHealthCards,
      sidebarItems,
    }),
    [
      currentUser,
      activeTab,
      handleLogoutAndRedirect,
      pageTitles,
      loadData,
      dashboardMessage,
      loading,
      animals,
      speciesData,
      speciesChartBackground,
      weeklyUsage,
      maxWeeklyUsage,
      healthStatusData,
      alerts,
      speciesDistribution,
      searchTerm,
      setSearchTerm,
      filterType,
      setFilterType,
      createAnimal,
      animalForm,
      handleAnimalChange,
      savingAnimal,
      feeders,
      createFeeder,
      feederForm,
      handleFeederChange,
      savingFeeder,
      updateFeederStatus,
      feedLogs,
      monthlyFeedCost,
      performanceScore,
      staff,
      createStaff,
      staffForm,
      handleStaffChange,
      savingStaff,
      vaccinations,
      createVaccination,
      vaccinationForm,
      handleVaccinationChange,
      savingVaccination,
      animalsById,
      healthRecords,
      systemHealthCards,
      sidebarItems,
    ]
  );

  const handleAuthSuccess = useCallback(async (token, user) => {
    setToken(token);
    setCurrentUser(user);
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user || null));
    await loadData();
    showNotification(`Welcome ${user?.name || user?.email || "back"}.`, "success");
    navigate("/", { replace: true });
  }, [loadData, navigate]);

  // App routes: login and protected dashboard
  return (
    <>
      <NotificationToaster />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <AuthView onAuthSuccess={handleAuthSuccess} /> : <Navigate to="/" replace />} />
        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DashboardView app={dashboardProps} darkMode={darkMode} setDarkMode={setDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </>
  );
}

export default App; // Fixed JSX structure