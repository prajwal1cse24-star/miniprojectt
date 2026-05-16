import {
  getAnimals,
  getFeeders,
  getFeedLogs,
  getHealthRecords,
  getVaccinations,
} from "../data/store.js";

export const buildAlerts = async () => {
  const [animals, feeders, feedLogs, healthRecords, vaccinations] = await Promise.all([
    getAnimals(),
    getFeeders(),
    getFeedLogs(),
    getHealthRecords(),
    getVaccinations(),
  ]);

  const safe = (arr) => Array.isArray(arr) ? arr : [];

  const alerts = [
    ...safe(feeders)
      .filter((feeder) => Number(feeder.feedLevel) < 30)
      .map((feeder) => ({
        message: `${feeder.location || "Unknown feeder"} is below 30% feed level`,
        severity: "warning",
        type: "Low feed level",
      })),
    ...safe(feeders)
      .filter((feeder) => feeder.status === "Offline")
      .map((feeder) => ({
        message: `${feeder.location || "Unknown feeder"} is offline`,
        severity: "critical",
        type: "Feeder offline",
      })),
    ...safe(feedLogs)
      .filter((log) => Number(log.quantity) > 35)
      .map((log) => ({
        message: `${log.animal?.name || "Animal"} consumed ${log.quantity} units`,
        severity: "info",
        type: "High feed usage",
      })),
    ...safe(vaccinations)
      .filter((vaccination) => vaccination && vaccination.dueDate && new Date(vaccination.dueDate) < new Date() && vaccination.status === "pending")
      .map((vaccination) => ({
        message: `${vaccination.animal?.name || "Animal"} needs ${vaccination.vaccineType}`,
        severity: "critical",
        type: "Overdue vaccination",
      })),
    ...safe(healthRecords)
      .filter((record) => record && record.condition === "critical")
      .map((record) => ({
        message: `${record.animal?.name || "Animal"} requires immediate attention`,
        severity: "critical",
        type: "Critical health issue",
      })),
  ];

  return alerts.map((alert, index) => ({
    _id: `${Date.now().toString(36)}-${index}`,
    ...alert,
    createdAt: new Date().toISOString(),
  }));
};

export const getAlerts = async (req, res) => {
  try {
    const alerts = await buildAlerts();
    res.json(alerts);
  } catch (err) {
    console.error("Failed to build alerts:", err);
    res.status(500).json({ message: "Failed to build alerts" });
  }
};