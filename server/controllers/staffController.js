// Staff accounts: the admin makes them, switches their powers on or off, and
// decides about their password. Staff can only ask to change their password.
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { cleanPermissions, PERMISSION_KEYS } = require("../utils/permissions");
const { logActivity } = require("../utils/activity");

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt ignores everything after 72 bytes
const MAX_STAFF = 20;
const APPROVAL_HOURS = 24;

const POWER_LABELS = {
  createOrders: "Create orders",
  editOrders: "Edit orders",
  deleteOrders: "Delete orders",
  shareSlip: "Delivery slip and Share",
};
const onOff = (value) => (value ? "on" : "off");

// One line in the Activity history about a staff member
const logStaff = (req, action, staff, summary, changes) =>
  logActivity(req, {
    kind: "staff",
    action,
    targetLabel: staff.name,
    summary,
    changes,
  });

const passwordProblem = (password) =>
  typeof password !== "string" ||
  password.length < MIN_PASSWORD ||
  password.length > MAX_PASSWORD
    ? `Password must be ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`
    : null;

// What the admin screen needs to know about a staff member (never the hash)
const toStaffView = (user) => {
  const change = user.passwordChange || {};
  const expired =
    change.status === "approved" && change.approvedUntil && change.approvedUntil < new Date();
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    active: user.active !== false,
    permissions: cleanPermissions(user.permissions || {}),
    passwordChange: {
      status: expired ? "none" : change.status || "none",
      requestedAt: change.requestedAt,
      approvedUntil: change.approvedUntil,
    },
    createdAt: user.createdAt,
  };
};

// A staff member of THIS shop (never someone else's)
const findStaff = (req) =>
  User.findOne({ _id: req.params.id, role: "staff", shopId: req.shop._id });

// ---------- Admin ----------

// GET /api/staff
const listStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ role: "staff", shopId: req.shop._id }).sort({
      _id: 1,
    });
    res.status(200).json({ staff: staff.map(toStaffView) });
  } catch (err) {
    next(err);
  }
};

// POST /api/staff   { name, username, password, permissions }
const createStaff = async (req, res, next) => {
  try {
    const { name, password } = req.body || {};
    const username =
      typeof req.body?.username === "string"
        ? req.body.username.trim().toLowerCase()
        : "";

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Please enter the staff member's name." });
    }
    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({
        error: "Username must be 3 to 30 letters, numbers, dots, dashes or underscores.",
      });
    }
    const problem = passwordProblem(password);
    if (problem) return res.status(400).json({ error: problem });

    if ((await User.countDocuments({ role: "staff", shopId: req.shop._id })) >= MAX_STAFF) {
      return res.status(400).json({ error: `You can add at most ${MAX_STAFF} staff.` });
    }
    if (await User.exists({ username })) {
      return res.status(400).json({ error: "This username is taken. Please choose another." });
    }

    const staff = await User.create({
      name: name.trim(),
      username,
      email: `${username}@staff.invalid`, // made-up, staff log in with the username
      password: await bcrypt.hash(password, 10),
      role: "staff",
      shopId: req.shop._id,
      permissions: cleanPermissions(req.body.permissions),
    });

    logStaff(req, "staff.create", staff, `Added staff ${staff.name} (@${staff.username})`);

    res.status(201).json({ staff: toStaffView(staff) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "This username is taken. Please choose another." });
    }
    next(err);
  }
};

// PUT /api/staff/:id   { name?, permissions?, active? }
const updateStaff = async (req, res, next) => {
  try {
    const staff = await findStaff(req);
    if (!staff) return res.status(404).json({ error: "Staff member not found." });

    const { name, permissions, active } = req.body || {};
    const before = {
      name: staff.name,
      powers: cleanPermissions(staff.permissions || {}),
      active: staff.active !== false,
    };
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Name cannot be empty." });
      }
      staff.name = name.trim();
    }
    if (permissions !== undefined) {
      staff.permissions = cleanPermissions(permissions);
    }
    if (active !== undefined) {
      if (typeof active !== "boolean") {
        return res.status(400).json({ error: "Active must be true or false." });
      }
      staff.active = active;
    }

    await staff.save();

    // What this change did, for the Activity history
    const changes = [];
    if (staff.name !== before.name) {
      changes.push({ field: "Name", from: before.name, to: staff.name });
    }
    const now = cleanPermissions(staff.permissions || {});
    for (const key of PERMISSION_KEYS) {
      if (now[key] !== before.powers[key]) {
        changes.push({ field: POWER_LABELS[key], from: onOff(before.powers[key]), to: onOff(now[key]) });
      }
    }
    if ((staff.active !== false) !== before.active) {
      changes.push({ field: "Account", from: onOff(before.active), to: onOff(staff.active !== false) });
    }
    if (changes.length) {
      logStaff(req, "staff.update", staff, `Changed staff ${staff.name} (@${staff.username})`, changes);
    }

    res.status(200).json({ staff: toStaffView(staff) });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/staff/:id
const deleteStaff = async (req, res, next) => {
  try {
    const staff = await findStaff(req);
    if (!staff) return res.status(404).json({ error: "Staff member not found." });
    await staff.deleteOne();
    logStaff(req, "staff.delete", staff, `Removed staff ${staff.name} (@${staff.username})`);
    res.status(200).json({ message: "Staff member removed." });
  } catch (err) {
    next(err);
  }
};

// PUT /api/staff/:id/password   { password }   (admin sets it directly)
const resetStaffPassword = async (req, res, next) => {
  try {
    const problem = passwordProblem(req.body?.password);
    if (problem) return res.status(400).json({ error: problem });

    const staff = await findStaff(req);
    if (!staff) return res.status(404).json({ error: "Staff member not found." });

    staff.password = await bcrypt.hash(req.body.password, 10);
    staff.passwordChangedAt = new Date(); // logs them out everywhere
    staff.passwordChange = { status: "none" };
    await staff.save();

    logStaff(req, "staff.password_set", staff, `Set a new password for staff ${staff.name} (@${staff.username})`);

    res.status(200).json({ staff: toStaffView(staff) });
  } catch (err) {
    next(err);
  }
};

// POST /api/staff/:id/password-request/approve | deny
const decidePasswordRequest = (approve) => async (req, res, next) => {
  try {
    const staff = await findStaff(req);
    if (!staff) return res.status(404).json({ error: "Staff member not found." });

    if (staff.passwordChange?.status !== "requested") {
      return res.status(400).json({ error: "There is no password request to answer." });
    }

    staff.passwordChange = approve
      ? {
          status: "approved",
          requestedAt: staff.passwordChange.requestedAt,
          approvedUntil: new Date(Date.now() + APPROVAL_HOURS * 3600 * 1000),
        }
      : { status: "none" };
    await staff.save();

    logStaff(
      req,
      approve ? "staff.password_approved" : "staff.password_denied",
      staff,
      `${approve ? "Approved" : "Denied"} the password change for staff ${staff.name} (@${staff.username})`
    );

    res.status(200).json({ staff: toStaffView(staff) });
  } catch (err) {
    next(err);
  }
};

// ---------- Staff (about themselves) ----------

// POST /api/staff/me/password-request
const requestPasswordChange = async (req, res, next) => {
  try {
    const me = await User.findById(req.account.id);
    const status = me.passwordChange?.status;

    if (status === "requested") {
      return res.status(400).json({ error: "You already asked. Please wait for your admin." });
    }
    if (status === "approved" && me.passwordChange.approvedUntil > new Date()) {
      return res.status(400).json({ error: "Your admin already approved. You can change it now." });
    }

    me.passwordChange = { status: "requested", requestedAt: new Date() };
    await me.save();
    logStaff(req, "staff.password_requested", me, `${me.name} (@${me.username}) asked to change their password`);
    res.status(200).json({ passwordChange: toStaffView(me).passwordChange });
  } catch (err) {
    next(err);
  }
};

// POST /api/staff/me/password   { currentPassword, newPassword }
const changeOwnPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const me = await User.findById(req.account.id).select("+password");

    const change = me.passwordChange || {};
    if (change.status !== "approved" || !(change.approvedUntil > new Date())) {
      return res.status(403).json({
        error: "Your admin has not approved a password change. Ask for approval first.",
      });
    }

    const problem = passwordProblem(newPassword);
    if (problem) return res.status(400).json({ error: problem });
    if (
      typeof currentPassword !== "string" ||
      !(await bcrypt.compare(currentPassword, me.password))
    ) {
      return res.status(400).json({ error: "Your current password is not right." });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: "The new password must be different." });
    }

    me.password = await bcrypt.hash(newPassword, 10);
    me.passwordChangedAt = new Date();
    me.passwordChange = { status: "none" };
    await me.save();
    logStaff(req, "staff.password_changed", me, `${me.name} (@${me.username}) changed their password`);

    res.status(200).json({ message: "Password changed. Please login again." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  approvePasswordRequest: decidePasswordRequest(true),
  denyPasswordRequest: decidePasswordRequest(false),
  requestPasswordChange,
  changeOwnPassword,
};
