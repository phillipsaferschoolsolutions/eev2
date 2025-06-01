
// functions/src/submitCompletedV2Endpoint.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const formidable = require("formidable-serverless"); // Use formidable-serverless for Cloud Functions

// Placeholder for your actual image upload function.
// This function should take a file object (from formidable), an account ID, and an assignment ID,
// upload the file to Firebase Storage, and return a Promise that resolves with the public download URL.
async function uploadImageAsPromise(file, accountId, assignmentId) {
    // IMPORTANT: Implement your Firebase Storage upload logic here
    // Example structure:
    // const bucket = admin.storage().bucket(); // Ensure your default bucket is configured or specify one
    // const filePath = `assignment_uploads/${accountId}/${assignmentId}/${Date.now()}_${file.name}`;
    // try {
    //   await bucket.upload(file.path, { // formidable provides file.path for the temp uploaded file
    //     destination: filePath,
    //     public: true, // Or manage access via signed URLs
    //     metadata: {
    //       contentType: file.type,
    //     },
    //   });
    //   // Construct the public URL. This might vary based on your bucket settings (e.g., uniform vs. fine-grained access)
    //   // For public files:
    //   // return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    //   // For non-public, you might return the path and generate a signed URL later if needed.
    //   functions.logger.info(`File uploaded to Storage: ${filePath}`);
    //   return `https://storage.googleapis.com/${bucket.name}/${filePath}`; // Example public URL
    // } catch (error) {
    //   functions.logger.error("Error in uploadImageAsPromise:", error);
    //   throw error; // Re-throw to be caught by the caller
    // }
    functions.logger.warn(`uploadImageAsPromise is a placeholder. ${file.name} not actually uploaded.`);
    return `https://placehold.co/100x100.png?text=Uploaded+${file.name}`; // Return a placeholder
}


module.exports = (assignmentsv2App) => {
  if (!assignmentsv2App || typeof assignmentsv2App.put !== 'function') {
    functions.logger.error(
      "CRITICAL: assignmentsv2App instance was not provided or is invalid to submitCompletedV2Endpoint.js. " +
      "The /completed/:id endpoint cannot be registered."
    );
    return;
  }

  assignmentsv2App.put("/completed/:id", async (req, res) => {
    // Initialize Firestore and Timestamps here if not globally available in this scope
    // (Assuming admin is initialized elsewhere and db is obtained from it)
    const db = admin.firestore();
    const { Timestamp, FieldValue } = admin.firestore;

    // 1. Authorization and Basic Checks
    if (!req.headers.account || typeof req.headers.account !== 'string') {
        functions.logger.error("No account header provided for /completed/:id.");
        res.status(403).send({ error: "Unauthorized: Account header missing." });
        return;
    }
    const account = req.headers.account;
    const assignmentId = req.params.id;

    if (!assignmentId) {
        functions.logger.error("Assignment ID missing in URL for /completed/:id.");
        res.status(400).send({ error: "Bad Request: Assignment ID missing in URL." });
        return;
    }

    // @ts-ignore (req.user is populated by auth middleware)
    if (!req.user || !req.user.email) {
        functions.logger.error("User not authenticated or email missing for /completed/:id.");
        res.status(403).send({ error: "Unauthorized: User authentication issue." });
        return;
    }
    // @ts-ignore
    const userEmail = req.user.email;

    // 2. Validate Content-Type for multipart/form-data
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.startsWith("multipart/form-data")) {
        functions.logger.error("Invalid content type for /completed/:id", { contentType });
        res.status(400).send({ error: "Bad Request: Expected multipart/form-data." });
        return;
    }

    // 3. Parse Form Data and Process Files
    const form = formidable({ multiples: true, maxFileSize: 50 * 1024 * 1024 });

    let parsedFields, parsedFiles;
    try {
        [parsedFields, parsedFiles] = await new Promise((resolve, reject) => {
            form.parse(req, (err, pFields, pFiles) => {
                if (err) {
                    functions.logger.error("Error parsing form data for /completed/:id:", err);
                    reject(err); // This will be caught by the outer try/catch
                    return;
                }
                resolve([pFields, pFiles]);
            });
        });
    } catch (formParseError) {
        // @ts-ignore
        functions.logger.error("Form parsing failed for /completed/:id:", formParseError.message);
        // @ts-ignore
        res.status(400).send({ error: "Bad Request: Could not parse form data.", details: formParseError.message });
        return;
    }


    try {
        const fields = parsedFields;
        const files = parsedFiles;

        // 4. Prepare Final Assignment Data
        const todayForRecord = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'America/New_York' });

        // Safely parse JSON fields
        const parseJsonField = (fieldName, defaultValue = null) => {
            if (fields[fieldName] && typeof fields[fieldName] === 'string') {
                try {
                    return JSON.parse(fields[fieldName]);
                } catch (e) {
                    functions.logger.warn(`Could not parse JSON for field ${fieldName} in /completed/:id:`, e, { value: fields[fieldName] });
                    return defaultValue; // Or throw an error if field is critical
                }
            }
            return defaultValue;
        };

        const finalAssignmentData = {
            date: fields.date || todayForRecord, // prefer client date if sent, else today
            account: fields.account || account,
            audioNotesData: parseJsonField('audioNotesData', null),
            commentsData: parseJsonField('commentsData', null),
            completedBy: fields.completedBy || userEmail,
            completedTime: fields.completedTime || new Date().toISOString(),
            content: parseJsonField('content', {}),
            submittedTimeServer: Timestamp.now(),
            locationName: fields.locationName || "Location Missing",
            status: fields.status || "completed",
            assignmentPendingId: fields.assignmentPendingId || null, // Keep as string or null
            submittedOnPlatform: fields.submittedOnPlatform || "web",
            selectedSchool: "",
            completionDate: fields.date || todayForRecord,
            completionTime: null,
            uploadedPhotos: {}
        };

        // Derive selectedSchool, completionDate, completionTime from content if IDs are present in schema
        const assignmentDocSnap = await db.collection("assignments").doc(assignmentId).get();
        if (assignmentDocSnap.exists) {
            const assignmentSchema = assignmentDocSnap.data();
            if (assignmentSchema) { // Check if assignmentSchema is not undefined
                if (assignmentSchema.schoolSelectorId && finalAssignmentData.content[assignmentSchema.schoolSelectorId]) {
                    finalAssignmentData.selectedSchool = finalAssignmentData.content[assignmentSchema.schoolSelectorId];
                } else {
                    finalAssignmentData.selectedSchool = finalAssignmentData.locationName;
                }
                if (assignmentSchema.completionDateId && finalAssignmentData.content[assignmentSchema.completionDateId]) {
                    finalAssignmentData.completionDate = finalAssignmentData.content[assignmentSchema.completionDateId];
                }
                if (assignmentSchema.completionTimeId && finalAssignmentData.content[assignmentSchema.completionTimeId]) {
                    // @ts-ignore
                    finalAssignmentData.completionTime = finalAssignmentData.content[assignmentSchema.completionTimeId];
                }
            }
        } else {
            functions.logger.warn(`Original assignment document ${assignmentId} not found for deriving schema IDs.`);
            finalAssignmentData.selectedSchool = finalAssignmentData.locationName; // Fallback
        }

        // 5. Process File Uploads
        const uploadedFileLinks = {};
        const fileProcessingPromises = [];

        for (const fieldName in files) {
            const fileOrFiles = files[fieldName];
            // Ensure we are working with an array of files, even if only one was uploaded for the fieldName
            const fileArray = Array.isArray(fileOrFiles) ? fileOrFiles : (fileOrFiles ? [fileOrFiles] : []);

            for (const file of fileArray) {
                if (file && file.size > 0) {
                    // fieldName is the name of the input field from the form, e.g., 'questionId_photoUpload'
                    const questionIdForFile = fieldName; 

                    fileProcessingPromises.push(
                        uploadImageAsPromise(file, account, assignmentId)
                            .then(link => {
                                // @ts-ignore
                                uploadedFileLinks[questionIdForFile] = {
                                    date: todayForRecord,
                                    link: link,
                                    submittedBy: finalAssignmentData.completedBy,
                                    originalName: file.name // Store original file name if useful
                                };
                            })
                            .catch(uploadError => {
                                functions.logger.error(`Error uploading file for field ${questionIdForFile} in /completed/:id:`, uploadError);
                                // Optionally, you could add error info to a response or skip the file
                            })
                    );
                }
            }
        }
        await Promise.all(fileProcessingPromises);

        // Merge with pre-existing syncPhotoLinks if any (from drafts)
        const syncedPhotos = parseJsonField('syncPhotoLinks', {});
        if (syncedPhotos) {
            for (const qId in syncedPhotos) {
                // @ts-ignore
                if (!uploadedFileLinks[qId] && syncedPhotos[qId]) { // Only add if not overwritten and has a value
                     // @ts-ignore
                    uploadedFileLinks[qId] = {
                        date: todayForRecord,
                        link: typeof syncedPhotos[qId] === 'object' ? syncedPhotos[qId].url : syncedPhotos[qId], // Handle if syncPhotoLinks stores objects or just URLs
                        submittedBy: finalAssignmentData.completedBy,
                        originalName: typeof syncedPhotos[qId] === 'object' ? syncedPhotos[qId].name : 'synced_photo'
                    };
                }
            }
        }
        // @ts-ignore
        if (Object.keys(uploadedFileLinks).length > 0) {
            finalAssignmentData.uploadedPhotos = uploadedFileLinks;
        }


        // 6. Save to Firestore
        const subCollectionName = finalAssignmentData.status === "pending" ? "pending" : "completed";
        let finalSavedDocumentId = finalAssignmentData.assignmentPendingId; // Use this as the ID if updating a pending one

        if (finalAssignmentData.assignmentPendingId && typeof finalAssignmentData.assignmentPendingId === 'string') {
            if (finalAssignmentData.status === "pending") { // Updating an existing pending draft
                await db.collection("assignments").doc(assignmentId)
                    .collection(subCollectionName).doc(finalAssignmentData.assignmentPendingId)
                    .set({ ...finalAssignmentData, LastCompletedTime: FieldValue.serverTimestamp() }, { merge: true });
                functions.logger.info(`Pending assignment ${finalAssignmentData.assignmentPendingId} updated for ${assignmentId}.`);
            } else { // Submitting a completed version of a previous pending draft
                const pendingIdToDelete = finalAssignmentData.assignmentPendingId;
                delete finalAssignmentData.assignmentPendingId; // Remove this as it's no longer pending

                const docRef = await db.collection("assignments").doc(assignmentId)
                    .collection("completed").add({ ...finalAssignmentData, LastCompletedTime: FieldValue.serverTimestamp() });
                finalSavedDocumentId = docRef.id;
                
                // Delete the old pending draft
                await db.collection("assignments").doc(assignmentId)
                    .collection("pending").doc(pendingIdToDelete).delete();
                functions.logger.info(`Completed assignment ${finalSavedDocumentId} created, pending draft ${pendingIdToDelete} deleted for ${assignmentId}.`);
            }
        } else { // New submission (not from a pending draft)
            delete finalAssignmentData.assignmentPendingId; // Ensure it's not in the new doc
            const docRef = await db.collection("assignments").doc(assignmentId)
                .collection(subCollectionName).add({ ...finalAssignmentData, LastCompletedTime: FieldValue.serverTimestamp() });
            finalSavedDocumentId = docRef.id;
            functions.logger.info(`New ${subCollectionName} assignment ${finalSavedDocumentId} created for ${assignmentId}.`);
        }

        res.status(200).send({
            assignmentId: assignmentId, // The ID of the main assignment document
            documentId: finalSavedDocumentId, // The ID of the subcollection document (pending or completed)
            message: "Assignment processed successfully."
        });

    } catch (error) {
        // @ts-ignore
        functions.logger.error("Error processing completed assignment /completed/:id :", error.message, { stack: error.stack });
        if (!res.headersSent) {
             // @ts-ignore
            res.status(500).send({ error: "Internal Server Error", details: error.message });
        }
    }
  });

  functions.logger.info("✅ PUT /completed/:id route initialized on the provided Express app instance.");
};

    