
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Ensure Firebase Admin is initialized (typically in your index.js or main file)
// if (admin.apps.length === 0) {
//   admin.initializeApp();
// }
const db = admin.firestore();
const { FieldValue } = admin.firestore;

// --- Helper to generate unique IDs (e.g., UUID v4) ---
function generateUUID() {
  // Basic unique ID generator, consider a proper UUID library for production
  return db.collection("temp").doc().id;
}

/**
 * Handles the creation of new assignments.
 * Endpoint: POST /createassignment (or wherever this is routed)
 */
const createAssignmentHandler = async (req, res) => {
    // ----- 1. Authorization and Initial Setup -----
    if (!req.user || !req.user.email) { // req.user is populated by auth middleware
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

    const now = new Date();
    const todayFormatted = `${now.getFullYear()}-${("0" + (now.getMonth() + 1)).slice(-2)}-${("0" + now.getDate()).slice(-2)}`;

    // ----- 2. Prepare Main Assignment Document Data -----
    const assignmentData = {
        accountSubmittedFor: account,
        assessmentName: req.body.assessmentName || "Untitled Assignment",
        createdDate: todayFormatted,
        dueDate: req.body.dueDate || todayFormatted,
        frequency: req.body.frequency || "onetime",
        assignmentType: req.body.assignmentType || "assignment",
        author: authorEmail,
        description: req.body.description || `Assignment created by ${authorEmail} on ${todayFormatted}.`,
        communityShare: req.body.communityShare === true,
        shareWith: req.body.shareWith || { assignToUsers: [authorEmail] },
        status: req.body.status || "Pending",
        questions: [],
        timeStamp: FieldValue.serverTimestamp(),
        // schoolSelectorId, completionDateId, completionTimeId will be added during question processing
    };

    // ----- 3. Process Questions -----
    const inputQuestionsRaw = req.body.questions || req.body.content;
    const inputQuestions = Array.isArray(inputQuestionsRaw) ? inputQuestionsRaw : [];

    const processedQuestions = [];
    const questionIdResolutionMap = new Map();

    const questionsWithPermanentIds = inputQuestions.map((q, index) => {
        const tempId = q._uid || q.id || `temp_frontend_id_${index}`;
        const permanentId = (q._uid && !q._uid.startsWith("#") && !q._uid.startsWith("new-") && !q._uid.startsWith("temp_frontend_id_")) 
                            ? q._uid 
                            : generateUUID();
        questionIdResolutionMap.set(tempId, permanentId);
        return { ...q, permanentId: permanentId, originalTempId: tempId };
    });

    let questionNumberCounter = 0;
    const alphaSuffix = ['.', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    const conditionalSubCounters = {};

    for (const [index, qData] of questionsWithPermanentIds.entries()) {
        const finalQuestionId = qData.permanentId;
        const optionsArray = [];
        if (qData.options) {
            const optsSource = Array.isArray(qData.options) ? qData.options : String(qData.options).split(';').map(opt => opt.trim()).filter(opt => opt);
            optsSource.forEach(opt => optionsArray.push({ component: "option", label: opt, value: opt }));
        }

        let finalConditionalConfig = undefined;
        if (qData.conditional && qData.conditional.field) {
            const resolvedFieldId = questionIdResolutionMap.get(qData.conditional.field);
            if (resolvedFieldId) {
                finalConditionalConfig = { field: resolvedFieldId, value: qData.conditional.value };
            } else {
                functions.logger.warn(`Could not resolve conditional field ID '${qData.conditional.field}' for question '${finalQuestionId}'.`);
            }
        } else if (qData.conditionalQuestionId) { // Legacy
            const resolvedFieldId = questionIdResolutionMap.get(qData.conditionalQuestionId);
            if (resolvedFieldId) {
                finalConditionalConfig = { field: resolvedFieldId, value: qData.conditionalQuestionValue || "" };
            } else {
                functions.logger.warn(`Could not resolve legacy conditionalQuestionId '${qData.conditionalQuestionId}' for question '${finalQuestionId}'.`);
            }
        }
        
        let questionDisplayNumber = "";
        if (finalConditionalConfig && finalConditionalConfig.field) {
            const parentQuestionProcessed = processedQuestions.find(pq => pq.id === finalConditionalConfig.field);
            const parentQuestionOriginalData = questionsWithPermanentIds.find(pq => pq.permanentId === finalConditionalConfig.field);
            
            let parentDisplayNumber = "";
            if (parentQuestionProcessed) {
                parentDisplayNumber = parentQuestionProcessed.questionNumber;
            } else if (parentQuestionOriginalData) {
                // Fallback if parent is later in the array, use its eventual main number
                // This simple fallback assumes parent isn't also conditional for deep nesting display number.
                let tempParentIndex = 0;
                for(let i=0; i < questionsWithPermanentIds.indexOf(parentQuestionOriginalData); i++) {
                    if (!questionsWithPermanentIds[i].conditional && !questionsWithPermanentIds[i].conditionalQuestionId) {
                        tempParentIndex++;
                    }
                }
                parentDisplayNumber = String(tempParentIndex + 1);
            }

            if (parentDisplayNumber) {
                conditionalSubCounters[finalConditionalConfig.field] = (conditionalSubCounters[finalConditionalConfig.field] || 0) + 1;
                const subIndex = conditionalSubCounters[finalConditionalConfig.field];
                questionDisplayNumber = `${parentDisplayNumber}${alphaSuffix[subIndex] || subIndex}`;
            } else {
                questionNumberCounter++;
                questionDisplayNumber = String(questionNumberCounter);
                functions.logger.warn(`Conditional parent ${finalConditionalConfig.field} not found for numbering child ${finalQuestionId}. Using main counter.`);
            }
        } else {
            questionNumberCounter++;
            questionDisplayNumber = String(questionNumberCounter);
        }

        const processedQ = {
            id: finalQuestionId,
            label: qData.label || "Untitled Question",
            component: qData.component || "text",
            options: optionsArray,
            required: qData.required === true,
            comment: qData.comment === true,
            photoUpload: qData.photoUpload === true,
            pageNumber: qData.pageNumber || 1,
            order: qData.order !== undefined ? qData.order : index + 1,
            questionNumber: questionDisplayNumber,

            conditional: finalConditionalConfig,
            deficiencyLabel: qData.deficiencyLabel,
            deficiencyValues: Array.isArray(qData.deficiencyValues) ? qData.deficiencyValues : [],
            aiDeficiencyCheck: qData.aiDeficiencyCheck === true,

            category: qData.category,
            subCategory: qData.subCategory,
            section: qData.section,
            subSection: qData.subSection,
            observationLocation: qData.observationLocation,
            criticality: qData.criticality || "low",
            originalQuestionId: qData.questionId, // Legacy obj.questionId
            assignedTo: qData.assignedTo || {}, // For per-question assignment
        };

        if (processedQ.component === "schoolSelector") assignmentData.schoolSelectorId = finalQuestionId;
        if (processedQ.component === "completionDate") assignmentData.completionDateId = finalQuestionId;
        if (processedQ.component === "completionTime") assignmentData.completionTimeId = finalQuestionId;

        processedQuestions.push(processedQ);
    }
    assignmentData.questions = processedQuestions;

    // ----- 4. Save Main Assignment Document -----
    let newAssignmentRef;
    try {
        newAssignmentRef = await db.collection("assignments").add(assignmentData);
        functions.logger.info(`Assignment created with ID: ${newAssignmentRef.id} for account ${account}`, { name: assignmentData.assessmentName });
    } catch (error) {
        functions.logger.error("Error saving main assignment document to Firestore:", error, { payload: assignmentData });
        res.status(500).send({error: "Internal Server Error: Could not save assignment data."});
        return;
    }

    // ----- 5. Assign to Users (Transaction Logic) -----
    const shareWithData = assignmentData.shareWith;
    const newAssignmentIdForUserRecords = newAssignmentRef.id;

    if (shareWithData && (shareWithData.assignToUsers || shareWithData.assignToLocations || shareWithData.assignToTitles)) {
        try {
            await db.runTransaction(async (transaction) => {
                const userEmailsToUpdate = new Set();

                if (Array.isArray(shareWithData.assignToUsers)) {
                    shareWithData.assignToUsers.forEach((email) => {
                        if (typeof email === 'string' && email.trim()) userEmailsToUpdate.add(email.trim());
                    });
                }

                const locationsToQuery = [];
                if (shareWithData.assignToLocations && typeof shareWithData.assignToLocations === 'object') {
                     Object.entries(shareWithData.assignToLocations).forEach(([locKey, locValue]) => {
                        if (locValue === true || (typeof locValue === 'object' && locValue.status === true)) {
                            locationsToQuery.push(locKey);
                        }
                    });
                }
                
                const titlesToQuery = [];
                if (shareWithData.assignToTitles && typeof shareWithData.assignToTitles === 'object') {
                   Object.entries(shareWithData.assignToTitles).forEach(([titleKey, titleValue]) => {
                       if (titleValue === true) titlesToQuery.push(titleKey);
                   });
                } else if (Array.isArray(shareWithData.assignToTitles)) { // Legacy array of strings
                    shareWithData.assignToTitles.forEach((title) => {
                       if (typeof title === 'string') titlesToQuery.push(title);
                    });
                }

                if (locationsToQuery.length > 0) {
                    const CHUNK_SIZE = 30;
                    for (let i = 0; i < locationsToQuery.length; i += CHUNK_SIZE) {
                        const chunk = locationsToQuery.slice(i, i + CHUNK_SIZE);
                        const usersByLocQuery = db.collection("users")
                            .where("account", "==", account)
                            .where("locationName", "in", chunk);
                        const usersByLocSnap = await transaction.get(usersByLocQuery);
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
                    const CHUNK_SIZE = 30;
                    for (let i = 0; i < titlesToQuery.length; i += CHUNK_SIZE) {
                        const chunk = titlesToQuery.slice(i, i + CHUNK_SIZE);
                        const usersByTitleQuery = db.collection("users")
                            .where("account", "==", account)
                            .where("title", "in", chunk);
                        const usersByTitleSnap = await transaction.get(usersByTitleQuery);
                        usersByTitleSnap.forEach(doc => {
                            const userData = doc.data();
                            if (userData && userData.email && typeof userData.email === 'string') {
                                userEmailsToUpdate.add(userData.email);
                            }
                        });
                    }
                }
                
                if (userEmailsToUpdate.size > 0) {
                    functions.logger.info(`Assigning assignment ${newAssignmentIdForUserRecords} to users:`, Array.from(userEmailsToUpdate));
                }
                userEmailsToUpdate.forEach(email => {
                    const userDocRef = db.collection("users").doc(email);
                    transaction.update(userDocRef, {
                        assignedToMe: FieldValue.arrayUnion({
                            assignmentId: newAssignmentIdForUserRecords,
                            assessmentName: assignmentData.assessmentName,
                            dueDate: assignmentData.dueDate,
                            status: "Pending"
                        })
                    });
                });
            }); // End transaction
            functions.logger.info(`Successfully processed user assignments for assignment ID: ${newAssignmentIdForUserRecords} in account ${account}.`);
        } catch (transactionError) {
            functions.logger.error(`User assignment transaction failure for assignment ${newAssignmentIdForUserRecords} in account ${account}:`, transactionError);
        }
    }

    // ----- 6. Send Response -----
    res.status(201).send({ id: newAssignmentRef.id, ...assignmentData });
};

// If this is the only function in the file, you might export it directly
// module.exports = { createAssignmentHandler };

// If it's part of an Express app (like original snippet implies with assignmentsApp.post):
// assignmentsApp.post("/createassignment", createAssignmentHandler);
// Or for a Firebase HTTP function:
// exports.createAssignmentV2 = functions.https.onRequest(createAssignmentHandler);

// For the purpose of this example, I'll assume it's directly callable as createAssignmentHandler
// And you would integrate it into your Firebase Functions export structure.
module.exports = { createAssignmentHandler };

    