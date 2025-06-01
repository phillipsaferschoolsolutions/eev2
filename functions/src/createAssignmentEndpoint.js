
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Ensure Firebase Admin is initialized (typically in your index.js or main file)
// if (admin.apps.length === 0) {
//   admin.initializeApp();
// }
const db = admin.firestore();
const { FieldValue } = admin.firestore;

/**
 * Generates a unique ID.
 * Replace with your actual generateQuestionId if it's a specific custom implementation.
 * This version uses Firestore's auto-ID generation method.
 */
async function generateQuestionId(count) {
    // This is a placeholder. The original code implies `generateQuestionId` returns an array of IDs.
    // For a self-contained solution, we'd generate one by one or adapt.
    // For now, assuming it's an external helper you have.
    // If not, individual IDs will be generated per question in the loop.
    if (typeof generateQuestionId.external === 'function') {
        return generateQuestionId.external(count);
    }
    functions.logger.warn("Using placeholder for generateQuestionId. Implement if custom logic is needed for an array of IDs.");
    const ids = [];
    for (let i = 0; i < count; i++) {
        ids.push(db.collection("temp").doc().id);
    }
    return ids;
}

// Placeholder for firebaseHelper if it's an external module you have
const firebaseHelper = {
    AssignmentQuestionsActions: async ({ assignmentId, content, action }) => {
        functions.logger.info("Placeholder: firebaseHelper.AssignmentQuestionsActions called", { assignmentId, action, questionCount: content.length });
        // Implement actual logic here if this helper is used,
        // e.g., saving questions to a separate subcollection.
        // For now, questions are embedded in the main assignment document.
        return Promise.resolve();
    }
};


const createAssignmentHandler = async (req, res) => {
    // 1. Authorization and Initial Setup
    // @ts-ignore (req.user is populated by auth middleware)
    if (!req.user || !req.user.email) {
        functions.logger.error("User not authenticated or email missing.");
        res.status(403).send({ error: "Unauthorized: User authentication issue." });
        return;
    }
    if (!req.headers.account || typeof req.headers.account !== 'string') {
        functions.logger.error("No account header provided or invalid format.");
        res.status(403).send({ error: "Unauthorized: Account header missing or invalid." });
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
    // const todayFormatted = `${year}-${month}-${day}`; // Alternative: YYYY-MM-DD for better sorting

    const alphaString = '.abcdefghijklmnopqrstuvwxyz'.split('');

    // 2. Prepare Main Assignment Document Data
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
        shareWith: req.body.shareWith || { assignToUsers: [authorEmail] },
        status: req.body.status || "Pending",
        timeStamp: FieldValue.serverTimestamp(),
        questions: [], // This will hold the processed questions
        schoolSelectorId: null,
        completionDateId: null,
        completionTimeId: null,
    };

    // 3. Process Questions
    let initContent = req.body.content || [];
    if (!Array.isArray(initContent)) {
        initContent = [];
        functions.logger.warn("req.body.content was not an array. Initializing to empty array.", { assessmentName: assignment.assessmentName });
    }

    // Generate IDs if `generateQuestionId` is a placeholder or if needed individually
    const proposedIdArray = await generateQuestionId(initContent.length);

    const contentStateArr = []; // For firebaseHelper.AssignmentQuestionsActions
    const questionIdResolutionMap = new Map(); // To map old UIDs to new permanent IDs

    // First pass for ID generation and reordering conditional questions (if necessary)
    // The original reordering logic was complex. A safer approach is to ensure parent questions are processed first
    // or use ID resolution robustly. For now, we'll rely on the order given and ID resolution.
    const questionsWithTempIds = initContent.map((q, index) => {
        const tempId = q._uid || q.id || `temp_frontend_id_${index}`;
        const permanentId = (q._uid && !q._uid.startsWith("#") && !q._uid.startsWith("new-"))
            ? q._uid
            : (proposedIdArray[index] || db.collection("temp").doc().id); // Fallback ID gen
        questionIdResolutionMap.set(tempId, permanentId);
        return { ...q, permanentId, originalTempId: tempId, originalIndex: index };
    });


    let questionNumberCount = 0;
    const conditionalQCounter = {};

    questionsWithTempIds.forEach((obj, index) => {
        const submittedField = {};
        submittedField.id = obj.permanentId; // Use the generated permanent ID

        // Convert legacy conditional structure to new, if present
        if (obj.conditionalQuestionId) {
            obj.conditional = {
                field: obj.conditionalQuestionId, // This will be resolved using the map
                value: obj.conditionalQuestionValue || ""
            };
        }
        
        submittedField.order = obj.order !== undefined ? obj.order : obj.originalIndex + 1;
        submittedField.photoUpload = obj.photoUpload === true;
        submittedField.component = obj.component || "text";
        submittedField.pageNumber = obj.pageNumber || 1;
        submittedField.label = obj.label || "Untitled Question";

        if (obj.component === "schoolSelector") assignment.schoolSelectorId = submittedField.id;
        if (obj.component === "completionDate") assignment.completionDateId = submittedField.id;
        if (obj.component === "completionTime") assignment.completionTimeId = submittedField.id;

        // Per-question assignment (legacy fields)
        if (Array.isArray(obj.assignedToEmail)) {
            submittedField.assignedToEmail = obj.assignedToEmail;
        } else if (obj.assignedToEmail && typeof obj.assignedToEmail === 'string') {
            submittedField.assignedToEmail = obj.assignedToEmail.replace(/; /g, ';').split(';');
        }
        if (obj.assignedToRole) submittedField.assignedToRole = obj.assignedToRole;
        if (Array.isArray(obj.assignedToLocations)) {
            submittedField.assignedToLocations = obj.assignedToLocations;
        } else if (obj.assignedToLocations && typeof obj.assignedToLocations === 'string' && obj.assignedToLocations.trim() !== "") {
            submittedField.assignedToLocations = obj.assignedToLocations.replace(/; /g, ';').split(';');
        } else {
            submittedField.assignedToLocations = [];
        }


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
        tempOptionArray.forEach(option => {
            options.push({ component: "option", label: option, value: option });
        });
        submittedField.options = options;

        // Conditional Logic and Question Numbering
        if (obj.conditional && obj.conditional.field) {
            const resolvedConditionalFieldId = questionIdResolutionMap.get(obj.conditional.field);
            if (resolvedConditionalFieldId) {
                submittedField.conditional = {
                    field: resolvedConditionalFieldId,
                    value: obj.conditional.value
                };

                let parentQuestionNumber = "0"; // Default if parent not found or not numbered yet
                const parentQuestion = contentStateArr.find(q => q.id === resolvedConditionalFieldId) ||
                                   assignment.questions.find(q => q.id === resolvedConditionalFieldId);


                if (parentQuestion) {
                    parentQuestionNumber = parentQuestion.questionNumber;
                } else {
                     // Attempt to find in already processed questions in this loop run if not in contentStateArr
                    const alreadyProcessedParent = assignment.questions.find(q => q.id === resolvedConditionalFieldId);
                    if (alreadyProcessedParent) {
                        parentQuestionNumber = alreadyProcessedParent.questionNumber;
                    } else {
                        functions.logger.warn(`Parent question ${resolvedConditionalFieldId} for conditional logic not found or not yet numbered for question ${submittedField.id}.`);
                    }
                }
                
                conditionalQCounter[resolvedConditionalFieldId] = (conditionalQCounter[resolvedConditionalFieldId] || 0) + 1;
                const subIndex = conditionalQCounter[resolvedConditionalFieldId];
                submittedField.questionNumber = `${parentQuestionNumber}${alphaString[subIndex] || subIndex}`; // e.g. 1a, 1b or 1.1, 1.2 if alphaString runs out
            } else {
                functions.logger.warn(`Could not resolve conditional field ID '${obj.conditional.field}' for question '${submittedField.id}'. Removing conditional.`);
                delete submittedField.conditional;
                questionNumberCount++;
                submittedField.questionNumber = String(questionNumberCount);
            }
        } else {
            questionNumberCount++;
            submittedField.questionNumber = String(questionNumberCount);
        }
        
        // Add to the main assignment's questions array
        assignment.questions.push(submittedField);
        // Also add to contentStateArr for the legacy firebaseHelper call
        contentStateArr.push(submittedField); // This one uses `id` instead of `_uid`
    });

    // 4. Save to Firestore
    let newAssignmentDocumentId = req.body.id; // If an ID is passed, assume it's for updating/setting with specific ID

    try {
        if (newAssignmentDocumentId && typeof newAssignmentDocumentId === 'string' && newAssignmentDocumentId.trim() !== "") {
            // This logic is more for an "update" or "create with specific ID" scenario.
            // For a pure "create new", .add() is usually preferred.
            // The original code used this conditional .set() or .add().
            await db.collection("assignments").doc(newAssignmentDocumentId).set(assignment);
            functions.logger.info(`Assignment set with specified ID: ${newAssignmentDocumentId} for account ${account}`);
        } else {
            const docRef = await db.collection("assignments").add(assignment);
            newAssignmentDocumentId = docRef.id;
            functions.logger.info(`Assignment added with auto-generated ID: ${newAssignmentDocumentId} for account ${account}`);
        }

        // Call the legacy firebaseHelper if it's still needed
        // Note: contentStateArr contains questions with `id` property, not `_uid` as per original code's `submittedField._uid`
        // If firebaseHelper strictly expects `_uid`, contentStateArr items would need to be mapped.
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


    // 5. Assign to Users (Transaction Logic) - adapted from original
    const shareWithData = assignment.shareWith;
    const finalAssignmentIdForUserRecords = newAssignmentDocumentId; // Use the actual doc ID

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
                if (shareWithData.assignToTitles && typeof shareWithData.assignToTitles === 'object') {
                    Object.keys(shareWithData.assignToTitles).forEach(titleKey => {
                        if (shareWithData.assignToTitles[titleKey] === true) titlesToQuery.push(titleKey);
                    });
                } else if (Array.isArray(shareWithData.assignToTitles)) { // Legacy
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
                            assignmentId: finalAssignmentIdForUserRecords, // Use the actual Firestore ID
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

    // 6. Send Response
    // The original code sent back the `assignment` object which didn't include the final ID if it was auto-generated.
    // Sending back an object that includes the definitive ID.
    res.status(201).send({ id: newAssignmentDocumentId, ...assignment });
};

// If this is the only function in the file, you might export it directly
// module.exports = { createAssignmentHandler };

// If it's part of an Express app (like original snippet implies with assignmentsApp.post):
// assignmentsApp.post("/createassignment", createAssignmentHandler); // Or your v2 route
// Or for a Firebase HTTP function:
// exports.createAssignmentV2 = functions.https.onRequest(createAssignmentHandler);

// For the purpose of this example, I'll assume it's directly callable as createAssignmentHandler
// And you would integrate it into your Firebase Functions export structure.
module.exports = { createAssignmentHandler };

    