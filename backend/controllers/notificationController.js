import { addNotification as storeAddNotification, getNotifications as storeGetNotifications } from "../data/store.js";
import { buildAlerts } from "./alertController.js";

export const getNotifications = async (req, res) => {
  const notifications = await storeGetNotifications();

  if (notifications.length > 0) {
    res.json(notifications);
    return;
  }

  const alerts = await buildAlerts();
  res.json(alerts.map((alert) => ({
    ...alert,
    title: alert.type,
  })));
};

export const createNotification = async (req, res) => {
  const notification = await storeAddNotification(req.body);
  res.json(notification);
};