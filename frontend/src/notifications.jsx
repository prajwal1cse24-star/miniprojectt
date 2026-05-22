import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, AlertCircle, Bell, CheckCircle } from "lucide-react";
import API_BASE from "./apiConfig.js";

export function showNotification(message, type = "info", duration = 4000) {
  const options = {
    duration,
    icon: undefined,
  };

  switch (type) {
    case "success":
      return toast.success(message, {
        ...options,
        icon: <CheckCircle size={20} className="text-green-500" />,
      });
    case "error":
      return toast.error(message, {
        ...options,
        icon: <AlertCircle size={20} className="text-red-500" />,
      });
    case "warning":
      return toast(
        () => (
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-500" />
            <span>{message}</span>
          </div>
        ),
        options
      );
    case "info":
    default:
      return toast(
        () => (
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-blue-500" />
            <span>{message}</span>
          </div>
        ),
        options
      );
  }
}

export function useAlerts() {
  const seenAlertsRef = useRef(new Set());

  useEffect(() => {
    const tokenLocal = localStorage.getItem("authToken");

    if (!tokenLocal) {
      return undefined;
    }

    const fetchAlerts = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/alerts`, {
          headers: tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {},
        });

        if (!response.ok) {
          return;
        }

        const alerts = await response.json();
        alerts.forEach((alert) => {
          const alertKey = alert._id || alert.id || `${alert.message}-${alert.severity}`;

          if (seenAlertsRef.current.has(alertKey)) {
            return;
          }

          seenAlertsRef.current.add(alertKey);
          const alertType = alert.severity === "critical" ? "error" : alert.severity === "warning" ? "warning" : "info";
          showNotification(alert.message, alertType);
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.warn("Skipping alerts fetch:", error?.message || error);
        }
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);

    return () => clearInterval(interval);
  }, []);
}