import FeedLog from "../models/FeedLog.js";

export const addFeedLog = async (req, res) => {
  const log = await FeedLog.create(req.body);
  res.json(log);
};

export const getFeedLogs = async (req, res) => {
  const logs = await FeedLog.find().populate("animal feeder");
  res.json(logs);
};