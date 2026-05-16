import {
  addFeedLog as storeAddFeedLog,
  getFeedLogs as storeGetFeedLogs,
  getAnimals as storeGetAnimals,
  getFeeders as storeGetFeeders,
} from "../data/store.js";

export const addFeedLog = async (req, res) => {
  const log = await storeAddFeedLog(req.body);
  res.json(log);
};

export const getFeedLogs = async (req, res) => {
  const logs = await storeGetFeedLogs();
  const animals = await storeGetAnimals();
  const feeders = await storeGetFeeders();

  const populated = logs.map((log) => ({
    ...log,
    animal: animals.find((item) => item._id === log.animal) || null,
    feeder: feeders.find((item) => item._id === log.feeder) || null,
  }));

  res.json(populated);
};