// storage.js
// Uploads generated report files to Firebase Storage and returns a public URL.
// (Swap this out for an S3/GCS equivalent if you prefer — same shape: take a
// local file path, return a publicly reachable URL.)

import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let initialized = false;

function initFirebase() {
  if (initialized) return;

  // Option A: service account JSON path via env var
  // Option B: paste the JSON into FIREBASE_SERVICE_ACCOUNT_JSON as a single-line string
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // e.g. "your-app.appspot.com"
  });

  initialized = true;
}

/**
 * Uploads a local file to Firebase Storage under /reports/ and returns
 * a long-lived signed URL (or a public URL if the bucket/object is public).
 */
export async function uploadReportFile(localFilePath) {
  initFirebase();

  const bucket = admin.storage().bucket();
  const destination = `reports/${path.basename(localFilePath)}`;

  await bucket.upload(localFilePath, {
    destination,
    metadata: {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });

  const file = bucket.file(destination);

  // Signed URL valid for 7 days — Messenger just needs it reachable at send time.
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  // Clean up the local temp file now that it's uploaded
  fs.unlink(localFilePath, () => {});

  return url;
}
