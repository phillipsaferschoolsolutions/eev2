// functions/src/reportStudioEndpoints.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

module.exports = (reportStudioApp) => {
  if (!reportStudioApp || typeof reportStudioApp.post !== 'function' || typeof reportStudioApp.get !== 'function') {
    functions.logger.error(
      "CRITICAL: reportStudioApp instance was not provided or is invalid to reportStudioEndpoints.js. " +
      "The report studio endpoints cannot be registered."
    );
    return;
  }

  // Save a report
  reportStudioApp.post("/savereport", async (req, res) => {
    try {
      // Check authentication
      if (!req.user || !req.user.email) {
        functions.logger.error("User not authenticated or email missing for /savereport.");
        return res.status(403).send({ error: "Unauthorized: User authentication required." });
      }

      // Check account header
      if (!req.headers.account || typeof req.headers.account !== 'string') {
        functions.logger.error("No account header provided for /savereport.");
        return res.status(403).send({ error: "Unauthorized: Account header missing." });
      }

      const { reportName, htmlContent, assignmentId, completionId } = req.body;
      
      // Validate required fields
      if (!reportName || !htmlContent || !assignmentId || !completionId) {
        return res.status(400).send({ error: "Missing required fields: reportName, htmlContent, assignmentId, completionId" });
      }

      // Create a new report document
      const reportData = {
        reportName,
        htmlContent,
        assignmentId,
        completionId,
        accountId: req.headers.account,
        createdBy: req.user.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("reports").add(reportData);
      
      functions.logger.info(`Report saved with ID: ${docRef.id} for account ${req.headers.account}`);
      
      return res.status(201).send({ 
        id: docRef.id,
        message: "Report saved successfully" 
      });
    } catch (error) {
      functions.logger.error("Error saving report:", error);
      return res.status(500).send({ error: "Failed to save report: " + error.message });
    }
  });

  // Get all reports for an account
  reportStudioApp.get("/reports", async (req, res) => {
    try {
      // Check authentication
      if (!req.user || !req.user.email) {
        functions.logger.error("User not authenticated or email missing for /reports.");
        return res.status(403).send({ error: "Unauthorized: User authentication required." });
      }

      // Check account header
      if (!req.headers.account || typeof req.headers.account !== 'string') {
        functions.logger.error("No account header provided for /reports.");
        return res.status(403).send({ error: "Unauthorized: Account header missing." });
      }

      const accountId = req.headers.account;
      
      // Query reports for this account
      const reportsSnapshot = await db.collection("reports")
        .where("accountId", "==", accountId)
        .orderBy("createdAt", "desc")
        .get();
      
      const reports = [];
      reportsSnapshot.forEach(doc => {
        reports.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return res.status(200).send(reports);
    } catch (error) {
      functions.logger.error("Error fetching reports:", error);
      return res.status(500).send({ error: "Failed to fetch reports: " + error.message });
    }
  });

  // Get a specific report by ID
  reportStudioApp.get("/reports/:reportId", async (req, res) => {
    try {
      // Check authentication
      if (!req.user || !req.user.email) {
        functions.logger.error("User not authenticated or email missing for /reports/:reportId.");
        return res.status(403).send({ error: "Unauthorized: User authentication required." });
      }

      // Check account header
      if (!req.headers.account || typeof req.headers.account !== 'string') {
        functions.logger.error("No account header provided for /reports/:reportId.");
        return res.status(403).send({ error: "Unauthorized: Account header missing." });
      }

      const { reportId } = req.params;
      const accountId = req.headers.account;
      
      // Get the report document
      const reportDoc = await db.collection("reports").doc(reportId).get();
      
      if (!reportDoc.exists) {
        return res.status(404).send({ error: "Report not found" });
      }
      
      const reportData = reportDoc.data();
      
      // Check if the report belongs to the user's account
      if (reportData.accountId !== accountId) {
        return res.status(403).send({ error: "You do not have permission to access this report" });
      }
      
      return res.status(200).send({
        id: reportDoc.id,
        ...reportData
      });
    } catch (error) {
      functions.logger.error("Error fetching report:", error);
      return res.status(500).send({ error: "Failed to fetch report: " + error.message });
    }
  });

  // Delete a report
  reportStudioApp.delete("/reports/:reportId", async (req, res) => {
    try {
      // Check authentication
      if (!req.user || !req.user.email) {
        functions.logger.error("User not authenticated or email missing for DELETE /reports/:reportId.");
        return res.status(403).send({ error: "Unauthorized: User authentication required." });
      }

      // Check account header
      if (!req.headers.account || typeof req.headers.account !== 'string') {
        functions.logger.error("No account header provided for DELETE /reports/:reportId.");
        return res.status(403).send({ error: "Unauthorized: Account header missing." });
      }

      const { reportId } = req.params;
      const accountId = req.headers.account;
      
      // Get the report document to check ownership
      const reportDoc = await db.collection("reports").doc(reportId).get();
      
      if (!reportDoc.exists) {
        return res.status(404).send({ error: "Report not found" });
      }
      
      const reportData = reportDoc.data();
      
      // Check if the report belongs to the user's account
      if (reportData.accountId !== accountId) {
        return res.status(403).send({ error: "You do not have permission to delete this report" });
      }
      
      // Delete the report
      await db.collection("reports").doc(reportId).delete();
      
      functions.logger.info(`Report ${reportId} deleted by ${req.user.email} for account ${accountId}`);
      
      return res.status(200).send({ message: "Report deleted successfully" });
    } catch (error) {
      functions.logger.error("Error deleting report:", error);
      return res.status(500).send({ error: "Failed to delete report: " + error.message });
    }
  });

  // Get prompt settings for an account
  reportStudioApp.get("/prompt-settings", async (req, res) => {
    try {
      // Check authentication
      if (!req.user || !req.user.email) {
        functions.logger.error("User not authenticated or email missing for /prompt-settings.");
        return res.status(403).send({ error: "Unauthorized: User authentication required." });
      }

      // Check account header
      if (!req.headers.account || typeof req.headers.account !== 'string') {
        functions.logger.error("No account header provided for /prompt-settings.");
        return res.status(403).send({ error: "Unauthorized: Account header missing." });
      }

      const accountId = req.headers.account;
      
      // Get the prompt settings document
      const settingsDoc = await db.collection("reportSettings").doc(accountId).get();
      
      if (!settingsDoc.exists) {
        return res.status(404).send({ error: "Prompt settings not found" });
      }
      
      return res.status(200).send(settingsDoc.data());
    } catch (error) {
      functions.logger.error("Error fetching prompt settings:", error);
      return res.status(500).send({ error: "Failed to fetch prompt settings: " + error.message });
    }
  });

  // Save prompt settings for an account
  reportStudioApp.post("/prompt-settings", async (req, res) => {
    try {
      // Check authentication
      if (!req.user || !req.user.email) {
        functions.logger.error("User not authenticated or email missing for POST /prompt-settings.");
        return res.status(403).send({ error: "Unauthorized: User authentication required." });
      }

      // Check account header
      if (!req.headers.account || typeof req.headers.account !== 'string') {
        functions.logger.error("No account header provided for POST /prompt-settings.");
        return res.status(403).send({ error: "Unauthorized: Account header missing." });
      }

      const accountId = req.headers.account;
      const { customPrompt, promptMode } = req.body;
      
      // Validate required fields
      if (customPrompt === undefined || !promptMode) {
        return res.status(400).send({ error: "Missing required fields: customPrompt, promptMode" });
      }
      
      // Validate promptMode
      if (promptMode !== "replace" && promptMode !== "extend") {
        return res.status(400).send({ error: "promptMode must be either 'replace' or 'extend'" });
      }
      
      // Save the prompt settings
      await db.collection("reportSettings").doc(accountId).set({
        customPrompt,
        promptMode,
        updatedBy: req.user.email,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      functions.logger.info(`Prompt settings saved for account ${accountId} by ${req.user.email}`);
      
      return res.status(200).send({ message: "Prompt settings saved successfully" });
    } catch (error) {
      functions.logger.error("Error saving prompt settings:", error);
      return res.status(500).send({ error: "Failed to save prompt settings: " + error.message });
    }
  });

  functions.logger.info("✅ Report Studio endpoints initialized on the provided Express app instance.");
};