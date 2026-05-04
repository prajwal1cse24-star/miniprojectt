import mongoose from "mongoose";

const feedLogSchema = new mongoose.Schema({
  animal: { type: mongoose.Schema.Types.ObjectId, ref: "Animal" },
  feeder: { type: mongoose.Schema.Types.ObjectId, ref: "Feeder" },
  quantity: Number,
  date: { type: Date, default: Date.now },
});

export default mongoose.model("FeedLog", feedLogSchema);