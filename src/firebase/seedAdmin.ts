import { db } from './config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

/**
 * Bootstrap script to seed a Super Admin into the `admins` collection.
 * 
 * Usage:
 * Call `seedSuperAdmin(userUid, userEmail)` once to authorize the initial super administrator.
 * 
 * Example:
 * ```ts
 * import { seedSuperAdmin } from './firebase/seedAdmin';
 * await seedSuperAdmin('YOUR_FIREBASE_AUTH_UID', 'raviranjan8904@gmail.com');
 * ```
 */
export async function seedSuperAdmin(
  uid: string, 
  email: string = 'raviranjan8904@gmail.com'
): Promise<{ success: boolean; message: string }> {
  if (!uid) {
    throw new Error("UID is required to seed super admin");
  }

  try {
    // 1. Seed into admins collection (Allow-list)
    const adminRef = doc(db, 'admins', uid);
    await setDoc(adminRef, {
      email: email.toLowerCase(),
      role: 'super_admin',
      addedBy: 'system_bootstrap',
      createdAt: new Date().toISOString()
    }, { merge: true });

    // 2. If user doc already exists in 'users' collection, ensure role is 'admin'
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await updateDoc(userRef, {
        role: 'admin',
        status: 'active'
      });
    }

    return {
      success: true,
      message: `Successfully seeded super admin (${email}) with UID: ${uid}`
    };
  } catch (error: any) {
    console.error("Error seeding super admin:", error);
    return {
      success: false,
      message: error?.message || 'Failed to seed super admin'
    };
  }
}
