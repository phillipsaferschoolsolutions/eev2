
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Ensure Firebase Admin is initialized (typically in your index.js or main file)
// if (admin.apps.length === 0) {
//   admin.initializeApp();
// }
const db = admin.firestore();
const { FieldValue } = admin.firestore;

// DEPENDENCY: generateQuestionId() - Assuming this is available or you'll replace it
// For now, a placeholder that uses Firestore's auto-ID.
// If generateQuestionId is supposed to return an array as per original code,
// this placeholder needs to be adjusted or the calling code adapted.
async function generateQuestionId(count = 1) {
    // This is a placeholder. The original code implies `generateQuestionId` returns an array of IDs.
    // If generateQuestionId.external is your actual function, ensure it's correctly available.
    if (typeof generateQuestionId.external === 'function') {
        return generateQuestionId.external(count);
    }
    functions.logger.warn("Using placeholder for generateQuestionId. Ensure custom logic for array of IDs is implemented if needed.");
    const ids = [];
    for (let i = 0; i < count; i++) {
        ids.push(db.collection("temp").doc().id);
    }
    return ids; // Returns array even for count=1 for consistency with original expectation if it was an array
}


// Placeholder for firebaseHelper
const firebaseHelper = {
    AssignmentQuestionsActions: async ({ assignmentId, content, action }) => {
        functions.logger.info("Placeholder: firebaseHelper.AssignmentQuestionsActions called", { assignmentId, action, questionCount: content.length });
        // Implement actual logic here if this helper is used.
        return Promise.resolve();
    }
};


// This is the refactored handler logic
const createAssignmentHandlerInternal = async (req, res) => {
    // ----- 1. Authorization and Initial Setup -----
    if (!req.user || !req.user.email) { // req.user should be populated by your auth middleware
        functions.logger.error("User not authenticated or email missing.");
        res.status(403).send({error: "Unauthorized: User authentication issue."});
        return;
    }
    if (!req.headers.account || typeof req.headers.account !== 'string') {
        functions.logger.error("No account header provided or invalid format.");
        res.status(403).send({error: "Unauthorized: Account header missing or invalid."});
        return;
    }

    const account = req.headers.account;
    const authorEmail = req.user.email;

    const date = new Date();
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = ("0" + localDate.getDate()).slice(-2);
    const month = ("0" + (localDate.getMonth() + 1)).slice(-2);
    const year = localDate.getFullYear();
    const today = `${month}-${day}-${year}`; // Original format: MM-DD-YYYY

    const alphaString = '.abcdefghijklmnopqrstuvwxyz'.split('');

    // ----- 2. Prepare Main Assignment Document Data -----
    const assignment = {
        accountSubmittedFor: account,
        assessmentName: req.body.assessmentName || "Untitled Assignment",
        assignmentAdminArray: req.body.assignmentAdminArray || [],
        createdDate: today,
        dueDate: req.body.dueDate || today,
        frequency: req.body.frequency || "onetime",
        assignmentType: req.body.assignmentType || "assignment",
        author: authorEmail,
        description: req.body.description || `Assignment created by ${authorEmail} on ${today}.`,
        communityShare: req.body.communityShare === true,
        shareWith: req.body.shareWith || { assignToUsers: [authorEmail] }, // Default: assign to self
        status: req.body.status || "Pending",
        timeStamp: FieldValue.serverTimestamp(),
        questions: [], // This will hold the processed questions
        schoolSelectorId: null,
        completionDateId: null,
        completionTimeId: null,
    };

    // ----- 3. Process Questions -----
    let initContent = req.body.content || [];
    if (!Array.isArray(initContent)) {
        initContent = [];
        functions.logger.warn("req.body.content was not an array. Initializing to empty array.", { assessmentName: assignment.assessmentName });
    }
    
    const proposedIdArray = await generateQuestionId(initContent.length);

    const contentStateArr = []; // For firebaseHelper.AssignmentQuestionsActions (flat list of questions)
    const questionIdResolutionMap = new Map(); // To map old UIDs to new permanent IDs

    // First pass for ID generation and reordering conditional questions (original logic)
    // This reordering is complex and can be error-prone. A robust ID resolution is generally preferred.
    initContent.forEach((row, index) => {
        row.pageNumber = row.pageNumber == null ? 1 : row.pageNumber;
        if (row.conditional && row.conditional.field && !row.conditionalQuestionId) { // Convert new conditional to old for reordering step
            row.conditionalQuestionId = row.conditional.field;
            row.conditionalQuestionValue = row.conditional.value;
        }
        if (row.conditionalQuestionId) {
            let placeholder = initContent.findIndex((r) => r._uid == row.conditionalQuestionId);
            if (placeholder > index) { // If conditioning question is LATER in the array
                initContent.splice(placeholder + 1, 0, row); // Move current row after its parent
                initContent.splice(index, 1); // Delete old instance of current row
            }
        }
         // Re-assign order after potential splice, though this might be better done after all splicing
        initContent.forEach((item, newIdx) => item.order = newIdx + 1);
    });


    let questionNumberCount = 0;
    const conditionalQCounter = {}; // Stores count of conditional children for each parent ID

    initContent.forEach((obj, index) => {
        const submittedField = {};
        
        // Assign/Resolve ID
        const originalFrontendId = obj._uid || obj.id; // Frontend might send _uid or id for new items
        let permanentId;
        if (originalFrontendId && !String(originalFrontendId).startsWith("#") && !String(originalFrontendId).startsWith("new-")) {
            permanentId = originalFrontendId;
        } else {
            permanentId = proposedIdArray[index] || db.collection("temp").doc().id; // Fallback ID gen
        }
        questionIdResolutionMap.set(originalFrontendId, permanentId);
        submittedField.id = permanentId; // Use 'id' consistently for the permanent ID

        // Update conditionalQuestionId references in the rest of initContent if they referred to this old_uid
        if (originalFrontendId !== permanentId) {
            initContent.forEach((itemToUpdate) => {
                if (itemToUpdate.conditionalQuestionId === originalFrontendId) {
                    itemToUpdate.conditionalQuestionId = permanentId;
                }
                if (itemToUpdate.conditional && itemToUpdate.conditional.field === originalFrontendId) {
                    itemToUpdate.conditional.field = permanentId;
                }
            });
            if(conditionalQCounter[originalFrontendId]) {
                conditionalQCounter[permanentId] = conditionalQCounter[originalFrontendId];
                delete conditionalQCounter[originalFrontendId];
            }
        }

        submittedField.order = obj.order !== undefined ? obj.order : index + 1; // Use re-calculated order or original index
        submittedField.photoUpload = obj.photoUpload === true;
        submittedField.component = obj.component || "text";
        submittedField.pageNumber = obj.pageNumber || 1;
        submittedField.label = obj.label || "Untitled Question";

        if (obj.component === "schoolSelector") assignment.schoolSelectorId = submittedField.id;
        if (obj.component === "completionDate") assignment.completionDateId = submittedField.id;
        if (obj.component === "completionTime") assignment.completionTimeId = submittedField.id;
        
        // Per-question assignment (legacy fields)
        if (Array.isArray(obj.assignedToEmail)) submittedField.assignedToEmail = obj.assignedToEmail;
        else if (obj.assignedToEmail && typeof obj.assignedToEmail === 'string') submittedField.assignedToEmail = obj.assignedToEmail.replace(/; /g, ';').split(';');
        
        if (obj.assignedToRole) submittedField.assignedToRole = obj.assignedToRole;
        
        if (Array.isArray(obj.assignedToLocations)) submittedField.assignedToLocations = obj.assignedToLocations;
        else if (obj.assignedToLocations && typeof obj.assignedToLocations === 'string' && obj.assignedToLocations.trim() !== "") submittedField.assignedToLocations = obj.assignedToLocations.replace(/; /g, ';').split(';');
        else submittedField.assignedToLocations = [];

        if (obj.category) submittedField.category = obj.category;
        submittedField.comment = obj.comment === true;
        if (obj.subCategory) submittedField.subCategory = obj.subCategory;
        if (obj.section) submittedField.section = obj.section;
        if (obj.subSection) submittedField.subSection = obj.subSection;
        if (obj.observationLocation) submittedField.observationLocation = obj.observationLocation;
        submittedField.criticality = obj.criticality || "low";
        
        // Deficiency fields (from new editor)
        if (obj.deficiencyLabel) submittedField.deficiencyLabel = obj.deficiencyLabel;
        if (Array.isArray(obj.deficiencyValues)) submittedField.deficiencyValues = obj.deficiencyValues;
        if (typeof obj.aiDeficiencyCheck === 'boolean') submittedField.aiDeficiencyCheck = obj.aiDeficiencyCheck;
        
        submittedField.required = obj.required === true;
        if (obj.questionId) submittedField.originalQuestionId = obj.questionId; // Legacy "origQuestionId"

        // Options processing
        const options = [];
        let tempOptionArray = [];
        if (Array.isArray(obj.options)) tempOptionArray = obj.options;
        else if (typeof obj.options === 'string') tempOptionArray = obj.options.split(';').map(opt => opt.trim()).filter(Boolean);
        tempOptionArray.forEach(option => options.push({ component: "option", label: option, value: option }));
        submittedField.options = options;

        // Conditional Logic and Question Numbering
        // Prefer new conditional structure if present, else use legacy conditionalQuestionId
        const conditionalSource = obj.conditional || (obj.conditionalQuestionId ? { field: obj.conditionalQuestionId, value: obj.conditionalQuestionValue } : null);

        if (conditionalSource && conditionalSource.field) {
            const resolvedConditionalFieldId = questionIdResolutionMap.get(conditionalSource.field) || conditionalSource.field; // Fallback if somehow not in map
            submittedField.conditional = { field: resolvedConditionalFieldId, value: conditionalSource.value || "" };

            let parentQuestionNumber = "0";
            const parentQuestionInContentState = contentStateArr.find(q => q.id === resolvedConditionalFieldId);
            const parentQuestionInAssignment = assignment.questions.find(q => q.id === resolvedConditionalFieldId);

            if (parentQuestionInContentState) parentQuestionNumber = parentQuestionInContentState.questionNumber;
            else if (parentQuestionInAssignment) parentQuestionNumber = parentQuestionInAssignment.questionNumber;
            else {
                 // Attempt to find in already processed items in this loop for numbering if parent not fully processed yet
                 const alreadyProcessedParent = assignment.questions.find(q => q.id === resolvedConditionalFieldId);
                 if (alreadyProcessedParent && alreadyProcessedParent.questionNumber) {
                     parentQuestionNumber = alreadyProcessedParent.questionNumber;
                 } else {
                    functions.logger.warn(`Parent question ${resolvedConditionalFieldId} for conditional logic not found or not yet numbered for question ${submittedField.id}.`);
                 }
            }
            
            conditionalQCounter[resolvedConditionalFieldId] = (conditionalQCounter[resolvedConditionalFieldId] || 0) + 1;
            const subIndex = conditionalQCounter[resolvedConditionalFieldId];
            submittedField.questionNumber = `${parentQuestionNumber}${alphaString[subIndex] || subIndex}`; // e.g. 1a, 1b or 1.1, 1.2 if alphaString runs out
        } else {
            questionNumberCount++;
            submittedField.questionNumber = String(questionNumberCount);
        }
        
        assignment.questions.push(submittedField);
        contentStateArr.push(submittedField); // For firebaseHelper, ensure it expects 'id' not '_uid'
    });

    // ----- 4. Save to Firestore -----
    let newAssignmentDocumentId = req.body.id; // If an ID is passed, assume it's for updating/setting with specific ID

    try {
        if (newAssignmentDocumentId && typeof newAssignmentDocumentId === 'string' && newAssignmentDocumentId.trim() !== "") {
            await db.collection("assignments").doc(newAssignmentDocumentId).set(assignment);
            functions.logger.info(`Assignment set with specified ID: ${newAssignmentDocumentId} for account ${account}`);
        } else {
            const docRef = await db.collection("assignments").add(assignment);
            newAssignmentDocumentId = docRef.id;
            functions.logger.info(`Assignment added with auto-generated ID: ${newAssignmentDocumentId} for account ${account}`);
        }

        await firebaseHelper.AssignmentQuestionsActions({
            assignmentId: newAssignmentDocumentId,
            content: contentStateArr, // This is an array of processed questions
            action: "BATCH_UPDATE_OVERWRITE_ALL"
        });

    } catch (error) {
        functions.logger.error("Error saving assignment to Firestore:", error, { payload: assignment });
        res.status(500).send({ error: "Internal Server Error: Could not save assignment data." });
        return;
    }


    // ----- 5. Assign to Users (Transaction Logic) -----
    const shareWithData = assignment.shareWith;
    const finalAssignmentIdForUserRecords = newAssignmentDocumentId; 

    if (shareWithData && (shareWithData.assignToUsers || shareWithData.assignToLocations || shareWithData.assignToTitles)) {
        try {
            await db.runTransaction(async (t) => {
                const userEmailsToUpdate = new Set();

                if (Array.isArray(shareWithData.assignToUsers)) {
                    shareWithData.assignToUsers.forEach(email => {
                        if (typeof email === 'string' && email.trim()) userEmailsToUpdate.add(email.trim());
                    });
                }

                const locationsToQuery = [];
                if (shareWithData.assignToLocations && typeof shareWithData.assignToLocations === 'object') {
                    Object.keys(shareWithData.assignToLocations).forEach(locKey => {
                        if (shareWithData.assignToLocations[locKey] === true || 
                            (typeof shareWithData.assignToLocations[locKey] === 'object' && shareWithData.assignToLocations[locKey].status === true)) {
                            locationsToQuery.push(locKey);
                        }
                    });
                }

                const titlesToQuery = [];
                if (shareWithData.assignToTitles && typeof shareWithData.assignToTitles === 'object') { // New object format
                    Object.keys(shareWithData.assignToTitles).forEach(titleKey => {
                        if (shareWithData.assignToTitles[titleKey] === true) titlesToQuery.push(titleKey);
                    });
                } else if (Array.isArray(shareWithData.assignToTitles)) { // Legacy array of strings
                    shareWithData.assignToTitles.forEach(title => {
                        if (typeof title === 'string') titlesToQuery.push(title);
                    });
                }


                const CHUNK_SIZE = 30; // Firestore 'in' query limit

                if (locationsToQuery.length > 0) {
                    for (let i = 0; i < locationsToQuery.length; i += CHUNK_SIZE) {
                        const chunk = locationsToQuery.slice(i, i + CHUNK_SIZE);
                        const usersByLocQuery = db.collection("users")
                            .where("account", "==", account)
                            .where("locationName", "in", chunk);
                        const usersByLocSnap = await t.get(usersByLocQuery);
                        usersByLocSnap.forEach(doc => {
                            const userData = doc.data();
                            if (userData && userData.email && typeof userData.email === 'string') {
                                let shouldAdd = true;
                                if (titlesToQuery.length > 0) { // If titles also specified, user must match one
                                    shouldAdd = titlesToQuery.includes(userData.title);
                                }
                                if (shouldAdd) userEmailsToUpdate.add(userData.email);
                            }
                        });
                    }
                } else if (titlesToQuery.length > 0) { // Only titles specified, no locations
                    for (let i = 0; i < titlesToQuery.length; i += CHUNK_SIZE) {
                        const chunk = titlesToQuery.slice(i, i + CHUNK_SIZE);
                        const usersByTitleQuery = db.collection("users")
                            .where("account", "==", account)
                            .where("title", "in", chunk);
                        const usersByTitleSnap = await t.get(usersByTitleQuery);
                        usersByTitleSnap.forEach(doc => {
                            const userData = doc.data();
                            if (userData && userData.email && typeof userData.email === 'string') {
                                userEmailsToUpdate.add(userData.email);
                            }
                        });
                    }
                }
                
                if (userEmailsToUpdate.size > 0) {
                    functions.logger.info(`Assigning assignment ${finalAssignmentIdForUserRecords} to users:`, Array.from(userEmailsToUpdate));
                }
                userEmailsToUpdate.forEach(email => {
                    const userDocRef = db.collection("users").doc(email);
                    t.update(userDocRef, {
                        assignedToMe: FieldValue.arrayUnion({
                            assignmentId: finalAssignmentIdForUserRecords, 
                            assessmentName: assignment.assessmentName,
                            dueDate: assignment.dueDate,
                            status: "Pending"
                        })
                    });
                });
            });
            functions.logger.info(`Successfully processed user assignments for assignment ID: ${finalAssignmentIdForUserRecords} in account ${account}.`);
        } catch (transactionError) {
            functions.logger.error(`User assignment transaction failure for assignment ${finalAssignmentIdForUserRecords}:`, transactionError);
        }
    }

    // ----- 6. Send Response -----
    res.status(201).send({ id: newAssignmentDocumentId, ...assignment });
};

/**
 * Initializes the /createassignment route on a given Express app/router instance.
 * This function should be called from your main Firebase Functions index.js
 * or your Express app setup file.
 *
 * @param {object} appInstance - An Express app or router instance.
 */
module.exports.initializeCreateAssignmentRoute = (appInstance) => {
  if (!appInstance || typeof appInstance.post !== 'function') {
    functions.logger.error(
      "Invalid Express app/router instance provided to initializeCreateAssignmentRoute. " +
      "The /createassignment endpoint could not be registered."
    );
    return;
  }
  // It's good practice for the appInstance to have express.json() middleware applied
  // before this route if it's not already global.
  // Example: appInstance.use(express.json());
  // Also, auth middleware should be applied before this route.

  appInstance.post("/createassignment", createAssignmentHandlerInternal);
  functions.logger.info("✅ POST /createassignment route initialized.");
};

// For direct export if not using the initializer pattern (less common for complex setups)
module.exports.createAssignmentHandler = createAssignmentHandlerInternal;

// Example of how this file might be used in your main index.js for Firebase Functions:
//
// const functions = require("firebase-functions");
// const express = require("express");
// const cors = require("cors"); // If using CORS
// const myAuthMiddleware = require("./middleware/auth"); // Your auth middleware
//
// // --- Initialize Express app for /assignmentsv2 ---
// const assignmentsV2App = express();
// assignmentsV2App.use(cors({ origin: true })); // Apply CORS
// assignmentsV2App.use(express.json());      // Middleware to parse JSON request bodies
// assignmentsV2App.use(myAuthMiddleware);      // Your custom authentication middleware
//
// // Import and initialize the /createassignment route
// const createAssignmentEndpoint = require('./api/createAssignmentEndpoint'); // Adjust path
// createAssignmentEndpoint.initializeCreateAssignmentRoute(assignmentsV2App);
//
// // Potentially other routes for assignmentsV2App...
// // assignmentsV2App.get("/otherroute", (req, res) => { /* ... */ });
//
// // Export the Express app as a Firebase Function for the /assignmentsv2 base URL
// exports.assignmentsv2 = functions.https.onRequest(assignmentsV2App);
//

// If you only have one handler in this file and want to export it directly for Firebase Functions:
// exports.createAssignmentV2 = functions.https.onRequest(async (req, res) => {
//   // Apply middleware manually if not using Express
//   // e.g., await someAuthMiddleware(req, res, async () => {
//   //   await createAssignmentHandlerInternal(req, res);
//   // });
//   // This pattern is simpler if you don't need a full Express app for this function.
//   // However, your original code used `assignmentsApp.post`, suggesting an Express setup.
// });

    