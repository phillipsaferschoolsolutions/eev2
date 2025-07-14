const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const db = admin.firestore();
const permissionsApp = express();
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

permissionsApp.use(cors({origin: true}));

// Using middleware for ALL routes
const authMiddleware = require("./authMiddleware");
permissionsApp.use(authMiddleware);

// Express-session
const session = require('express-session');
permissionsApp.use(
  session({
    secret: 'jnkasndADJWSNe323@', // Replace with a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true, // Ensures the cookie cannot be accessed via JavaScript
      secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
      maxAge: 3600000, // Cookie expiration time in milliseconds
    },
  })
);

/** Convert server admin time to plain English
  * @param {Object} object - firestore.admin server time object with { _seconds, _nanonseconds }
  * @return {message} - Plain English
*/
function convertTime(object) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timezone: 'America/New_York' };
  const day = new Date(object?._seconds * 1000 + object?._nanoseconds / 1000000).toLocaleDateString('en-US', options);
  const time = new Date(object?._seconds * 1000 + object?._nanoseconds / 1000000).toLocaleTimeString('en-US', { timeZone: 'America/New_York' });
  const message = `${day} at ${time}`;
  return message;
}

/**
  * @param {String} key - party to send the email to.
  * @param {String} order - 'asc' or 'desc'.
  * @return {Object}
*/
function compareValues(key, order = "asc") {
  return function innerSort(a, b) {
    if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
      return 0;
    }
    const varA = (typeof a[key] === "string") ? a[key].toUpperCase() : a[key];
    const varB = (typeof b[key] === "string") ? b[key].toUpperCase() : b[key];

    let comparison = 0;
    if (varA > varB) {
      comparison = 1;
    } else if (varA < varB) {
      comparison = -1;
    }
    return (
      (order === "desc") ? (comparison * -1) : comparison
    );
  };
}

// ===== NEW ROLE-BASED ENDPOINTS =====

/**
 * Get all roles for an account
 */
permissionsApp.get("/roles", async (req, res) => {
  if (!req.headers.account) {
    functions.logger.error(
      "No account was passed as a token in the Authorization header.",
      "Make sure you authorize your request by providing the following HTTP header:",
      "account: <account>",
    );
    res.status(403).send("Unauthorized");
    return;
  }
  
  const account = req.headers.account;
  
  try {
    const snapshot = await db.collection("roles")
      .where("account", "==", account)
      .get();
    
    let roles = [];
    snapshot.forEach((doc) => {
      const id = doc.id;
      const data = doc.data();
      roles.push({id, ...data});
    });
    
    roles = roles.sort(compareValues("name"));
    res.status(200).send(JSON.stringify(roles));
  } catch (error) {
    functions.logger.error("Error fetching roles:", error);
    res.status(500).send({ error: "Failed to fetch roles" });
  }
});

/**
 * Get a specific role by ID
 */
permissionsApp.get("/roles/:id", async (req, res) => {
  try {
    const snapshot = await db.collection("roles").doc(req.params.id).get();
    
    if (!snapshot.exists) {
      res.status(404).send({ error: "Role not found" });
      return;
    }
    
    const roleId = snapshot.id;
    const roleData = snapshot.data();
    
    res.status(200).send(JSON.stringify({id: roleId, ...roleData}));
  } catch (error) {
    functions.logger.error("Error fetching role:", error);
    res.status(500).send({ error: "Failed to fetch role" });
  }
});

/**
 * Create a new role
 */
permissionsApp.post("/roles", async (req, res) => {
  if (!req.headers.account) {
    functions.logger.error(
      "No account was passed as a token in the Authorization header.",
      "Make sure you authorize your request by providing the following HTTP header:",
      "account: <account>",
    );
    res.status(403).send("Unauthorized");
    return;
  }
  
  try {
    const role = req.body;
    role.account = req.headers.account;
    role.createdAt = admin.firestore.FieldValue.serverTimestamp();
    role.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    const docRef = await db.collection("roles").add(role);
    
    res.status(201).send({ id: docRef.id, ...role });
  } catch (error) {
    functions.logger.error("Error creating role:", error);
    res.status(500).send({ error: "Failed to create role" });
  }
});

/**
 * Update an existing role
 */
permissionsApp.put("/roles/:id", async (req, res) => {
  try {
    const roleRef = db.collection("roles").doc(req.params.id);
    const snapshot = await roleRef.get();
    
    if (!snapshot.exists) {
      res.status(404).send({ error: "Role not found" });
      return;
    }
    
    const role = snapshot.data();
    
    // Don't allow updating system roles
    if (role.isSystem) {
      res.status(403).send({ error: "Cannot modify system roles" });
      return;
    }
    
    const updates = req.body;
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await roleRef.update(updates);
    
    res.status(200).send({ id: req.params.id, ...role, ...updates });
  } catch (error) {
    functions.logger.error("Error updating role:", error);
    res.status(500).send({ error: "Failed to update role" });
  }
});

/**
 * Delete a role
 */
permissionsApp.delete("/roles/:id", async (req, res) => {
  try {
    const roleRef = db.collection("roles").doc(req.params.id);
    const snapshot = await roleRef.get();
    
    if (!snapshot.exists) {
      res.status(404).send({ error: "Role not found" });
      return;
    }
    
    const role = snapshot.data();
    
    // Don't allow deleting system roles
    if (role.isSystem) {
      res.status(403).send({ error: "Cannot delete system roles" });
      return;
    }
    
    await roleRef.delete();
    
    res.status(200).send({ message: "Role deleted successfully" });
  } catch (error) {
    functions.logger.error("Error deleting role:", error);
    res.status(500).send({ error: "Failed to delete role" });
  }
});

/**
 * Initialize default system roles for an account
 */
permissionsApp.post("/roles/initialize", async (req, res) => {
  if (!req.headers.account) {
    functions.logger.error(
      "No account was passed as a token in the Authorization header.",
      "Make sure you authorize your request by providing the following HTTP header:",
      "account: <account>",
    );
    res.status(403).send("Unauthorized");
    return;
  }
  
  try {
    const account = req.headers.account;
    const defaultRoles = req.body.defaultRoles;
    
    if (!defaultRoles || !Array.isArray(defaultRoles)) {
      res.status(400).send({ error: "Invalid default roles data" });
      return;
    }
    
    const batch = db.batch();
    
    for (const role of defaultRoles) {
      const roleRef = db.collection("roles").doc(role.id);
      const snapshot = await roleRef.get();
      
      if (!snapshot.exists) {
        batch.set(roleRef, {
          ...role,
          account,
          isSystem: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    await batch.commit();
    
    res.status(200).send({ message: "Default roles initialized successfully" });
  } catch (error) {
    functions.logger.error("Error initializing default roles:", error);
    res.status(500).send({ error: "Failed to initialize default roles" });
  }
});

/**
 * Assign a role to a user
 */
permissionsApp.post("/users/:userId/role", async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    
    if (!roleId) {
      res.status(400).send({ error: "Role ID is required" });
      return;
    }
    
    // Verify the role exists
    const roleRef = db.collection("roles").doc(roleId);
    const roleSnapshot = await roleRef.get();
    
    if (!roleSnapshot.exists) {
      res.status(404).send({ error: "Role not found" });
      return;
    }
    
    // Update the user's role
    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    
    if (!userSnapshot.exists) {
      res.status(404).send({ error: "User not found" });
      return;
    }
    
    await userRef.update({
      role: roleId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(200).send({ message: "Role assigned successfully" });
  } catch (error) {
    functions.logger.error("Error assigning role to user:", error);
    res.status(500).send({ error: "Failed to assign role to user" });
  }
});

// ===== LEGACY ENDPOINTS =====

// These endpoints are kept for backward compatibility
// They interact with the old permissions structure

permissionsApp.get("/", async (req, res) => {
  if (!req.headers.account) {
    functions.logger.error(
        "No account was passed as a token in the Authorization header.",
        "Make sure you authorize your request by providing the following HTTP header:",
        "account: <account>",
    );
    res.status(403).send("Unauthorized");
    return;
  }
  const account = req.headers.account;
  const snapshot = await db.collection("permissions").doc(req.headers.account).collection("permissions").where("account", "==", account).get();
  let permissions = [];
  snapshot.forEach((doc)=>{
    const id = doc.id;
    const data = doc.data();
    permissions.push({id, ...data});
  });
  permissions = permissions.sort(compareValues("order"));
  console.log(permissions)
  res.status(200).send(JSON.stringify(permissions));
});

permissionsApp.get("/:id", async (req, res) => {
  const snapshot = await db.collection("permissions").doc(req.params.id).get();
  const permissionsId = snapshot.id;
  const permissionsData = snapshot.data();
  res.status(200).send(JSON.stringify({id: permissionsId, ...permissionsData}));
});

permissionsApp.post("/single", (req, res) => {
  const permission = req.body;
  permission.account = req.headers.account;
  permission.lastEdited = convertTime(Timestamp.now());
  db.collection("permissions").add(permission);
  res.status(201).send();
});

permissionsApp.post("/", async (req, res) => {
  if (!req.headers.account) {
    functions.logger.error(
        "No account was passed as a token in the Authorization header.",
        "Make sure you authorize your request by providing the following HTTP header:",
        "account: <account>",
    );
    res.status(403).send("Unauthorized");
    return;
  }
  const body = req.body;
  functions.logger.log("POSTING NEW/UPDATED PERMISSIONS");
  const batchCommits = [];
  let batch = db.batch();
  body.forEach((record, i) => {
    record.account = req.headers.account;
    record.lastEdited = convertTime(Timestamp.now());
    const docRef = db.collection("permissions").doc(req.headers.account).collection("permissions").doc(record.id);
    batch.set(docRef, record);
    if ((i+1)%500 === 0) {
      console.log(`Writing record ${i + 1}`);
      batchCommits.push(batch.commit());
      batch = db.batch();
    }
  });
  batchCommits.push(batch.commit());
  res.status(201).send();
});

permissionsApp.put("/:id", async (req, res) => {
  const body = req.body;
  await db.collection("permissions").doc(req.params.id).update({
    ...body,
  });
  res.status(200).send();
});

permissionsApp.delete("/:id", async (req, res) => {
  await db.collection("permissions").doc(req.params.id).delete();
  res.status(200).send();
});

// Sets up Endpoint of 'permissions'
exports.permissions = functions.https.onRequest(permissionsApp);