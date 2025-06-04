widgetsApp.get('/completed-assignments', async (req, res) => {
  const accountId = req.query.accountId;
  const assignmentId = req.query.assignmentId;
  const timePeriod = req.query.timePeriod;

  try {
    let query;

    if (assignmentId) {
      // Query a specific assignment's completed subcollection
      query = admin.firestore().collection('assignments').doc(assignmentId).collection('completed');
    } else {
      // Query the completed subcollection across all assignments (Collection Group Query)
      query = admin.firestore().collectionGroup('completed');
    }

    if (accountId) {
      query = query.where('accountId', '==', accountId);
    }

    if (timePeriod) {
      const now = new Date();
      let startTime;

      switch (timePeriod) {
        case 'last 7 days':
          startTime = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'last 30 days':
          startTime = new Date(now.setDate(now.getDate() - 30));
          break;
        case 'last 1 year':
          startTime = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          // Optionally handle invalid time periods or ignore
          break;
      }

      if (startTime) {
        query = query.where('LastCompletedTime', '>=', startTime);
      }
    }

    const snapshot = await query.get();
    const completedAssignments = [];

    snapshot.forEach(doc => {
      completedAssignments.push({
        id: doc.id,
        data: doc.data(),
      });
    });

    res.status(200).json({
      status: 'success',
      data: completedAssignments,
    });
  } catch (error) {
    console.error('Error fetching completed assignments:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch completed assignments.',
    });
  }
});