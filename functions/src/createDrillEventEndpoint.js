
// functions/src/createDrillEventEndpoint.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Ensure Firebase Admin is initialized (typically in your index.js or main file if not already)
// if (admin.apps.length === 0) { admin.initializeApp(); }
const db = admin.firestore();
const { FieldValue } = admin.firestore;

module.exports = (drillTrackingApp) => {
  if (!drillTrackingApp || typeof drillTrackingApp.post !== 'function') {
    functions.logger.error(
      "CRITICAL: drillTrackingApp instance was not provided or is invalid to createDrillEventEndpoint.js. " +
      "The /createDrillEvent endpoint cannot be registered."
    );
    return;
  }

  drillTrackingApp.post("/createDrillEvent", async (req, res) => {
    // 1. Authorization and Input Validation
    if (!req.user || !req.user.email) {
      functions.logger.error("User not authenticated or email missing for createDrillEvent.");
      return res.status(403).send({ error: "Unauthorized: User authentication required." });
    }
    if (!req.headers.account || typeof req.headers.account !== 'string') {
      functions.logger.error("No account header provided or invalid format for createDrillEvent.");
      return res.status(403).send({ error: "Unauthorized: Account header missing or invalid." });
    }

    const accountId = req.headers.account;
    const createdByEmail = req.user.email;

    const {
      name,
      description,
      startDate, // Expected as ISO string from frontend
      endDate,   // Expected as ISO string from frontend
      requiredDrills, // Expected as Array of { typeId, typeName, instructions }
      assignedToSites, // Expected as Array of site IDs
    } = req.body;

    // Basic server-side validation (consider a library like Joi or Zod for more complex needs)
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).send({ error: "Bad Request: Event name is required." });
    }
    if (!startDate || !endDate) {
      return res.status(400).send({ error: "Bad Request: Start date and end date are required." });
    }
    if (!Array.isArray(requiredDrills) || requiredDrills.length === 0) {
      return res.status(400).send({ error: "Bad Request: At least one required drill must be selected." });
    }
    if (!Array.isArray(assignedToSites) || assignedToSites.length === 0) {
        return res.status(400).send({ error: "Bad Request: At least one site must be assigned." });
    }

    try {
        new Date(startDate);
        new Date(endDate);
    } catch (dateError) {
        return res.status(400).send({ error: "Bad Request: Invalid date format for startDate or endDate. ISO string expected." });
    }
    if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).send({ error: "Bad Request: End date cannot be before start date." });
    }


    // 2. Prepare Drill Event Data for Firestore
    const drillEventData = {
      name: name.trim(),
      description: description || "",
      accountId,
      startDate: new Date(startDate), // Store as Firestore Timestamp
      endDate: new Date(endDate),     // Store as Firestore Timestamp
      requiredDrills: requiredDrills.map(drill => ({
        typeId: drill.typeId || "unknown",
        typeName: drill.typeName || "Unknown Drill",
        instructions: drill.instructions || "",
      })),
      assignedToSites: assignedToSites || [],
      status: "scheduled", // Initial status
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: createdByEmail,
      // Add other fields as needed, e.g., recurrenceRule for future
    };

    // 3. Save to Firestore
    try {
      const docRef = await db.collection("drillEvents").add(drillEventData);
      functions.logger.info(`Drill Event added with ID: ${docRef.id} for account ${accountId}`);

      // --- Placeholder for Reminder Logic ---
      functions.logger.info(`[TODO for Drill Event ${docRef.id}] Implement reminder logic. Event Start: ${startDate}, End: ${endDate}.`);
      // Example: Schedule a Cloud Task to trigger a notification function.
      // This would involve setting up Cloud Tasks and another function to handle the task execution.
      // E.g., for each site in assignedToSites, schedule reminders for users at that site.

      return res.status(201).send({ 
          id: docRef.id, 
          ...drillEventData, 
          // Firestore timestamps are server-generated, approximate for immediate client response
          createdAt: new Date().toISOString(), 
          updatedAt: new Date().toISOString(),
          startDate: drillEventData.startDate.toISOString(), // Send back as ISO string
          endDate: drillEventData.endDate.toISOString(),     // Send back as ISO string
      });
    } catch (error) {
      functions.logger.error("Error saving drill event to Firestore:", error, { payload: drillEventData });
      return res.status(500).send({ error: "Internal Server Error: Could not save drill event data." });
    }
  });

  functions.logger.info("✅ POST /createDrillEvent route initialized on the provided Express app instance (drillTrackingApp).");
};
