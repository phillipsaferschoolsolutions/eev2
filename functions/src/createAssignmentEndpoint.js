
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// This file assumes 'assignmentsv2App' is an Express app or router instance
// already defined and passed into the scope where this file is required/executed.
// For example, in your main index.js:
// const assignmentsv2App = express();
// /* ... other middleware ... */
// require('./api/createAssignmentEndpoint')(assignmentsv2App); // Hypothetical way to pass app

// If 'assignmentsv2App' is not globally available or passed in, this file will error.
// This structure adheres to the user's request for the file to start with assignmentsv2App.post(...)

// Ensure Firebase Admin is initialized (typically in your index.js or main file)
// if (admin.apps.length === 0) {
//   admin.initializeApp();
// }
const db = admin.firestore();
const { FieldValue } = admin.firestore;

// --- Helper to generate unique IDs ---
function generateUUID() {
  return db.collection("temp").doc().id;
}

// DEPENDENCY: generateQuestionId() - Assuming this is available or you'll replace it
// For now, a placeholder that uses Firestore's auto-ID.
async function generateQuestionId(count = 1) {
    // This is a placeholder. The original code implies `generateQuestionId` returns an array of IDs.
    // If generateQuestionId.external is your actual function, ensure it's correctly available.
    if (typeof generateQuestionId.external === 'function') {
        // @ts-ignore
        return generateQuestionId.external(count);
    }
    functions.logger.warn("Using placeholder for generateQuestionId. Ensure custom logic for array of IDs is implemented if needed.");
    const ids = [];
    for (let i = 0; i < count; i++) {
        ids.push(db.collection("temp").doc().id);
    }
    return ids; // Returns array even for count=1 for consistency with original expectation if it was an array
}


// Placeholder for firebaseHelper (if it's used and not defined elsewhere)
const firebaseHelper = {
    AssignmentQuestionsActions: async ({ assignmentId, content, action }) => {
        functions.logger.info("Placeholder: firebaseHelper.AssignmentQuestionsActions called", { assignmentId, action, questionCount: content.length });
        // Implement actual logic here if this helper is used. For example,
        // batch writing questions to a subcollection or another collection.
        // This example assumes content is an array of question objects.
        // Ensure the structure of 'content' matches what this helper expects.
        // if (action === "BATCH_UPDATE_OVERWRITE_ALL" && assignmentId && Array.isArray(content)) {
        //   const batch = db.batch();
        //   const questionsRef = db.collection("assignments").doc(assignmentId).collection("assignmentQuestions");
        //   // Optional: Delete existing questions first if it's a true overwrite
        //   // const existingSnapshot = await questionsRef.get();
        //   // existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        //
        //   content.forEach(question => {
        //     const questionDocRef = questionsRef.doc(question.id); // Assuming question has an 'id'
        //     batch.set(questionDocRef, question);
        //   });
        //   await batch.commit();
        //   functions.logger.info(`Batch updated/overwrote questions for assignment ${assignmentId}`);
        // }
        return Promise.resolve();
    }
};


// This module exports a function that expects an Express app instance
module.exports = (assignmentsv2App) => {
  if (!assignmentsv2App || typeof assignmentsv2App.post !== 'function') {
    functions.logger.error(
      "CRITICAL: assignmentsv2App instance was not provided or is invalid to createAssignmentEndpoint.js. " +
      "The /createassignment endpoint cannot be registered."
    );
    // Depending on how critical this is, you might throw an error:
    // throw new Error("assignmentsv2App is not a valid Express app/router.");
    return; // Stop further execution if appInstance is invalid
  }

  assignmentsv2App.post("/createassignment", async (req, res) => {
    // ----- 1. Authorization and Initial Setup -----
    // @ts-ignore (req.user is populated by auth middleware, e.g., firebase-functions-auth)
    if (!req.user || !req.user.email) {
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
    // @ts-ignore
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
    let initContent = req.body.content || []; // Legacy: questions might come in 'content'
    if (!Array.isArray(initContent) || initContent.length === 0) {
        // New frontend might send questions in 'req.body.questions'
        if (Array.isArray(req.body.questions) && req.body.questions.length > 0) {
            initContent = req.body.questions;
        } else {
            initContent = []; // Ensure it's an array
            functions.logger.warn("req.body.content or req.body.questions was not a non-empty array. Initializing to empty array.", { assessmentName: assignment.assessmentName });
        }
    }
    
    const proposedIdArray = await generateQuestionId(initContent.length);

    const contentStateArr = []; // For firebaseHelper.AssignmentQuestionsActions (flat list of questions)
    const questionIdResolutionMap = new Map(); // To map old UIDs to new permanent IDs

    // First pass for ID generation and reordering conditional questions (original logic)
    initContent.forEach((row, index) => {
        row.pageNumber = row.pageNumber == null ? 1 : row.pageNumber;
        // Convert new conditional structure from frontend editor to legacy for reordering step, if necessary
        if (row.conditional && row.conditional.field && !row.conditionalQuestionId) {
            row.conditionalQuestionId = row.conditional.field;
            row.conditionalQuestionValue = row.conditional.value;
            // row.conditional = true; // Not strictly needed if conditionalQuestionId is the main driver for reordering
        }
        if (row.conditionalQuestionId) {
            let placeholder = initContent.findIndex((r) => r._uid === row.conditionalQuestionId || r.id === row.conditionalQuestionId);
            if (placeholder > index) { 
                initContent.splice(placeholder + 1, 0, row); 
                initContent.splice(index, 1); 
            }
        }
    });
    // Re-assign order after potential splice
    initContent.forEach((item, newIdx) => item.order = newIdx + 1);


    let questionNumberCount = 0;
    const conditionalQCounter = {};

    initContent.forEach((obj, index) => {
        const submittedField = {};
        
        const originalFrontendId = obj._uid || obj.id; 
        let permanentId;

        if (originalFrontendId && !String(originalFrontendId).startsWith("#") && !String(originalFrontendId).startsWith("new-")) {
            permanentId = originalFrontendId;
        } else {
            permanentId = proposedIdArray[index] || generateUUID(); // Fallback ID gen
        }
        questionIdResolutionMap.set(originalFrontendId, permanentId);
        submittedField.id = permanentId;

        if (originalFrontendId && originalFrontendId !== permanentId) {
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
        
        submittedField.order = obj.order !== undefined ? obj.order : index + 1;
        submittedField.photoUpload = obj.photoUpload === true;
        submittedField.component = obj.component || "text";
        submittedField.pageNumber = obj.pageNumber || 1;
        submittedField.label = obj.label || "Untitled Question";

        if (obj.component === "schoolSelector") assignment.schoolSelectorId = submittedField.id;
        if (obj.component === "completionDate") assignment.completionDateId = submittedField.id;
        if (obj.component === "completionTime") assignment.completionTimeId = submittedField.id;
        
        // Per-question assignment (legacy fields mapping)
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
        if (Array.isArray(obj.options)) {
            tempOptionArray = obj.options;
        } else if (typeof obj.options === 'string') {
            tempOptionArray = obj.options.split(';').map(opt => opt.trim()).filter(Boolean);
        }
        tempOptionArray.forEach(option => options.push({ component: "option", label: option, value: option }));
        submittedField.options = options;

        // Conditional Logic and Question Numbering
        const conditionalSource = obj.conditional || (obj.conditionalQuestionId ? { field: obj.conditionalQuestionId, value: obj.conditionalQuestionValue } : null);

        if (conditionalSource && conditionalSource.field) {
            const resolvedConditionalFieldId = questionIdResolutionMap.get(conditionalSource.field) || conditionalSource.field;
            submittedField.conditional = { field: resolvedConditionalFieldId, value: conditionalSource.value || "" };

            let parentQuestionNumber = "0"; // Default if parent not found or numbered
            const parentInProcessed = contentStateArr.find(q => q.id === resolvedConditionalFieldId);
            const parentInAssignmentQuestions = assignment.questions.find(q => q.id === resolvedConditionalFieldId);

            if (parentInProcessed) parentQuestionNumber = parentInProcessed.questionNumber;
            else if (parentInAssignmentQuestions) parentQuestionNumber = parentInAssignmentQuestions.questionNumber;
            else {
                 const alreadyProcessedParent = assignment.questions.find(q => q.id === resolvedConditionalFieldId);
                 if (alreadyProcessedParent && alreadyProcessedParent.questionNumber) {
                     parentQuestionNumber = alreadyProcessedParent.questionNumber;
                 } else {
                    functions.logger.warn(`Parent question ${resolvedConditionalFieldId} for conditional logic not found or not yet numbered for question ${submittedField.id}. Defaulting parent number to 0.`);
                 }
            }
            
            conditionalQCounter[resolvedConditionalFieldId] = (conditionalQCounter[resolvedConditionalFieldId] || 0) + 1;
            const subIndex = conditionalQCounter[resolvedConditionalFieldId];
            submittedField.questionNumber = `${parentQuestionNumber}${alphaString[subIndex] || subIndex}`;
        } else {
            questionNumberCount++;
            submittedField.questionNumber = String(questionNumberCount);
        }
        
        assignment.questions.push(submittedField);
        contentStateArr.push(submittedField); // For firebaseHelper, ensure it expects 'id'
    });

    // ----- 4. Save to Firestore -----
    let newAssignmentDocumentId = req.body.id; 

    try {
        if (newAssignmentDocumentId && typeof newAssignmentDocumentId === 'string' && newAssignmentDocumentId.trim() !== "") {
            await db.collection("assignments").doc(newAssignmentDocumentId).set(assignment);
            functions.logger.info(`Assignment set with specified ID: ${newAssignmentDocumentId} for account ${account}`);
        } else {
            const docRef = await db.collection("assignments").add(assignment);
            newAssignmentDocumentId = docRef.id;
            functions.logger.info(`Assignment added with auto-generated ID: ${newAssignmentDocumentId} for account ${account}`);
        }

        // Ensure contentStateArr passes questions with 'id' if firebaseHelper expects it.
        await firebaseHelper.AssignmentQuestionsActions({
            assignmentId: newAssignmentDocumentId,
            content: contentStateArr, 
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


                const CHUNK_SIZE = 30; 

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
                                if (titlesToQuery.length > 0) { 
                                    shouldAdd = titlesToQuery.includes(userData.title);
                                }
                                if (shouldAdd) userEmailsToUpdate.add(userData.email);
                            }
                        });
                    }
                } else if (titlesToQuery.length > 0) { 
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
    res.status(201).send({ id: newAssignmentDocumentId, ...assignment }); // Ensure 'id' is the final Firestore ID
  });
  functions.logger.info("✅ POST /createassignment route initialized on the provided Express app instance.");
};

// Note: If you have only this endpoint in the file and want to export it directly
// for a single Firebase Function (without an encompassing Express app for this file),
// you would structure it differently, e.g.:
// exports.createAssignmentV2 = functions.https.onRequest(async (req, res) => {
//   // Apply middleware manually if needed
//   // await authMiddleware(req, res, async () => {
//   //    // ... then call the core logic here ...
//   // });
//   // The handler logic would be directly inside this exported function.
// });
// However, the request was for an assignmentsv2App.post(...) structure.

    