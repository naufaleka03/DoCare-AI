const { Firestore } = require("@google-cloud/firestore");

async function saveHistory(userId, data) {
  const db = new Firestore();
  const historiesCollection = db.collection("histories");

  const historyData = {
    userId,
    query: data.query,
    response: data.response,
    timestamp: new Date(),
  };

  return historiesCollection.add(historyData);
}

async function getHistories(userId) {
  const db = new Firestore();
  const historiesCollection = db.collection("histories");

  const snapshot = await historiesCollection
    .where("userId", "==", userId)
    .orderBy("timestamp", "desc")
    .limit(50)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate(),
  }));
}

module.exports = { saveHistory, getHistories };
