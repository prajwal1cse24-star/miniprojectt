import mongoose from "mongoose";

const animalSchema = new mongoose.Schema({
  name: String,
  type: String,
  age: Number,
});

export default mongoose.model("Animal", animalSchema);