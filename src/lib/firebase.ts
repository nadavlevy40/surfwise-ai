import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle private key newlines for local vs cloud envs
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      // IMPORTANT: This must use the specific variable from your .env
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET 
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

const db = admin.firestore();
const storage = admin.storage();

export { db, storage };