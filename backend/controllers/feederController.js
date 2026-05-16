import {
  addFeeder as storeAddFeeder,
  getFeeders as storeGetFeeders,
  updateFeederById,
} from "../data/store.js";

export const createFeeder = async (req, res) => {
  const feeder = await storeAddFeeder(req.body);
  res.json(feeder);
};

export const getFeeders = async (req, res) => {
  const feeders = await storeGetFeeders();
  res.json(feeders);
};

export const updateFeeder = async (req, res) => {
  const feeder = await updateFeederById(req.params.id, req.body);
  res.json(feeder);
};