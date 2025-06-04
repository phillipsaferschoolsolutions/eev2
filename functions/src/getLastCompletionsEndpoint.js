const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.getCompletedAssignments = functions.https.onCall(async (data, context) => {
  try {
    // Optional filtering by accountId
    const accountId = data?.accountId;

    let query = admin.firestore().collectionGroup('completed');

    // Apply accountId filter if provided
    if (accountId) {
      // Assuming each completion document has an 'accountId' field
      query = query.where('accountId', '==', accountId);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    const completedAssignments = [];
    snapshot.forEach(doc => {
      completedAssignments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return completedAssignments;

  } catch (error) {
    console.error('Error fetching completed assignments:', error);
    // Re-throw the error to be handled by the client
    throw new functions.https.HttpsError('internal', 'Unable to fetch completed assignments.', error);
  }
});