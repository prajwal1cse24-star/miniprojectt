import { addStaff as storeAddStaff, getStaff as storeGetStaff } from "../data/store.js";

export const createStaff = async (req, res) => {
  const staffMember = await storeAddStaff(req.body);
  res.json(staffMember);
};

export const getStaff = async (req, res) => {
  const staff = await storeGetStaff();
  res.json(staff);
};