const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.getCompletedAssignments = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const accountId = data.accountId;

  try {
    let query = admin.firestore().collectionGroup('completed');

    // If accountId is provided, filter the query
    if (accountId) {
      query = query.where('accountId', '==', accountId);
    }

    const snapshot = await query.get();

    const completedAssignments = [];
    snapshot.forEach(doc => {
      completedAssignments.push({
        id: doc.id,
        data: doc.data()
      });
    });

    return completedAssignments; // Return just the array for cleaner consumption on the frontend

  } catch (error) {
    console.error('Error fetching completed assignments:', error);
    throw new functions.https.HttpsError('internal', 'Unable to fetch completed assignments.', error);
  }
});
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.getCompletedAssignments = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const accountId = data.accountId;

  try {
    let query = admin.firestore().collectionGroup('completed');

    // If accountId is provided, filter the query
    if (accountId) {
      query = query.where('accountId', '==', accountId);
    }

    const snapshot = await query.get();

    const completedAssignments = [];
    snapshot.forEach(doc => {
      completedAssignments.push({
        id: doc.id,
        data: doc.data()
      });
    });

    return {
      status: 'success',
      data: completedAssignments
    };

  } catch (error) {
    console.error('Error fetching completed assignments:', error);
    throw new functions.https.HttpsError('internal', 'Unable to fetch completed assignments.', error);
  }
});