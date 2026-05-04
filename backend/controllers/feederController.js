import Feeder from "../models/Feeder.js";

export const createFeeder = async (req, res) => {
  const feeder = await Feeder.create({
    ...req.body,
    lastUpdated: new Date(),
  });
  res.json(feeder);
};

export const getFeeders = async (req, res) => {
  const feeders = await Feeder.find();
  res.json(feeders);
};

export const updateFeeder = async (req, res) => {
  const feeder = await Feeder.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      lastUpdated: new Date(),
    },
    { new: true }
  );

  res.json(feeder);
};