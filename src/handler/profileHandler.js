const { Firestore } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucket = storage.bucket(process.env.BUCKET_NAME);

async function uploadImage(file) {
  const blob = bucket.file(file.filename);
  const blobStream = blob.createWriteStream();

  return new Promise((resolve, reject) => {
    blobStream.on("finish", () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.on("error", (err) => {
      reject(err);
    });

    blobStream.end(file.buffer);
  });
}

async function getProfile(id) {
  const db = new Firestore();
  const profileCollection = db.collection("profile");
  const doc = await profileCollection.doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
}

async function updateProfile(id, data, image) {
  const db = new Firestore();
  const profileCollection = db.collection("profile");

  let profileData = { ...data };

  if (image) {
    const imageUrl = await uploadImage(image);
    profileData.imageUrl = imageUrl;
  }

  return profileCollection.doc(id).set(profileData, { merge: true });
}

module.exports = { updateProfile, getProfile };
