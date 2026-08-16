/**
 * ============================================================================
 * BOOTSTRAP INITIAL SUPER ADMIN IN FIRESTORE
 * ============================================================================
 * 
 * IMPORTANT:
 * Firestore security rules (firestore.rules) require an existing 'super_admin'
 * to write to the `admins` collection from client applications.
 * 
 * Therefore, the VERY FIRST super administrator cannot be bootstrapped from
 * the client web browser SDK (which would fail with permission-denied).
 * 
 * Choose one of the two methods below to seed your initial super administrator:
 * 
 * ----------------------------------------------------------------------------
 * METHOD 1: Firebase Console (Recommended & Quickest)
 * ----------------------------------------------------------------------------
 * 1. Go to Firebase Console -> Firestore Database.
 * 2. In the `admins` collection, click "+ Add document".
 *    - Document ID: <YOUR_FIREBASE_AUTH_UID> (e.g. your Google Sign-In UID)
 *    - Field `email`: "raviranjan8904@gmail.com" (string)
 *    - Field `role`: "super_admin" (string)
 *    - Field `addedBy`: "console_bootstrap" (string)
 *    - Field `createdAt`: "2026-08-17T00:00:00.000Z" (string)
 * 3. In the `users` collection, locate your user document (<YOUR_FIREBASE_AUTH_UID>):
 *    - Set `role`: "admin" (string)
 *    - Set `status`: "active" (string)
 * 4. Sign in to your application and navigate to /admin.
 * 
 * ----------------------------------------------------------------------------
 * METHOD 2: Firebase Admin SDK (Local Node Script with Service Account)
 * ----------------------------------------------------------------------------
 * 1. Download your service account key from:
 *    Firebase Console -> Project Settings -> Service Accounts -> "Generate new private key"
 * 2. Save it locally as `scripts/serviceAccountKey.json` (ensure it is .gitignored).
 * 3. Run:
 *    `node scripts/seedAdmin.cjs <YOUR_FIREBASE_AUTH_UID> [EMAIL]`
 * 
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedSuperAdminViaAdminSdk(
  uid, 
  email = 'raviranjan8904@gmail.com',
  serviceAccountPath
) {
  if (!uid) {
    throw new Error("UID is required to seed super admin");
  }

  const keyPath = serviceAccountPath || path.resolve(__dirname, 'serviceAccountKey.json');

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Service account key not found at ${keyPath}.\n` +
      `Please download it from Firebase Console -> Project Settings -> Service Accounts, or seed via the Firestore Console UI directly (Method 1).`
    );
  }

  let admin;
  try {
    const pkg = 'firebase-admin';
    const adminModule = await import(pkg);
    admin = adminModule.default || adminModule;
  } catch {
    throw new Error(
      "The 'firebase-admin' package is required to run this script.\n" +
      "Run: 'npm i -D firebase-admin' or create the admin document directly in the Firebase Console."
    );
  }

  if (!admin.apps || admin.apps.length === 0) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();

  // 1. Seed into admins collection (Allow-list)
  await db.collection('admins').doc(uid).set({
    email: email.toLowerCase(),
    role: 'super_admin',
    addedBy: 'admin_sdk_bootstrap',
    createdAt: new Date().toISOString()
  }, { merge: true });

  // 2. Sync users collection
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    await userRef.update({
      role: 'admin',
      status: 'active'
    });
  }

  console.log(`\n[Bootstrap Success] Seeded super admin (${email}) with UID: ${uid}`);
}

// CLI execution
const isDirectExecution = process.argv[1] && (
  process.argv[1] === __filename ||
  process.argv[1].endsWith('seedAdmin.js')
);

if (isDirectExecution) {
  const args = process.argv.slice(2);
  const targetUid = args[0];
  const targetEmail = args[1] || 'raviranjan8904@gmail.com';

  if (!targetUid) {
    console.error(`
Usage:
  node scripts/seedAdmin.cjs <FIREBASE_AUTH_UID> [EMAIL]

Example:
  node scripts/seedAdmin.cjs 4k7LmNpQ9rStUvWxYz raviranjan8904@gmail.com
`);
    process.exit(1);
  }

  seedSuperAdminViaAdminSdk(targetUid, targetEmail)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n[Bootstrap Error]:", err?.message || err);
      process.exit(1);
    });
}
