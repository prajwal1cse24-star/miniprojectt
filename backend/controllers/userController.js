import {
  getUsers as storeGetUsers,
  getUserById as storeGetUserById,
  updateUserRole as storeUpdateUserRole,
  createUserByAdmin as storeCreateUserByAdmin,
  deleteUserById as storeDeleteUserById,
} from "../data/store.js";

const sanitizeUser = (user) => {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser;
};

export const listUsers = async (req, res) => {
  const users = await storeGetUsers();
  res.json(users.map(sanitizeUser));
};

export const promoteUser = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) return res.status(400).json({ message: "role is required" });

  const user = await storeGetUserById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const updated = await storeUpdateUserRole(id, role);
  res.json(sanitizeUser(updated));
};

export const createUser = async (req, res) => {
  try {
    const created = await storeCreateUserByAdmin(req.body || {});
    return res.status(201).json(sanitizeUser(created));
  } catch (error) {
    return res.status(400).json({ message: error?.message || "Unable to create user" });
  }
};

export const removeUser = async (req, res) => {
  const { id } = req.params;

  const target = await storeGetUserById(id);
  if (!target) {
    return res.status(404).json({ message: "User not found" });
  }

  if (String(req.user?._id) === String(id)) {
    return res.status(400).json({ message: "Admin cannot remove own account" });
  }

  const removed = await storeDeleteUserById(id);
  return res.json({ message: "User removed", user: sanitizeUser(removed) });
};
