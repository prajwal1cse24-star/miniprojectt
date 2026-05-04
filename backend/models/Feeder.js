import mongoose from "mongoose";

const feederSchema = new mongoose.Schema({
  location: String,
  status: String,
  feedLevel: Number,
  batteryLevel: Number,
  networkStatus: String,
  schedule: String,
  feedQuantity: Number,
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model("Feeder", feederSchema);