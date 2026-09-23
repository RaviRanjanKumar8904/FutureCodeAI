import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, githubProvider } from '../firebase/config';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { AuthContext, type User } from './authContextInstance';

export type { User };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up any previous Firestore snapshot listener
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);

        // Use onSnapshot for live role updates (promotions/demotions)
        unsubscribeSnapshot = onSnapshot(
          userRef, 
          (snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.data() as User;

              // If institute is not active (pending, rejected, or inactive), don't log them in fully
              if (userData.role === 'institute' && userData.status !== 'active') {
                auth.signOut();
                setUser(null);
              } else {
                setUser(userData);
              }
            } else {
              // No user doc yet — they're mid-signup; signInWithOAuth will create it
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to user document:', error);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const signInWithOAuth = async (role: 'student' | 'admin' | 'institute' | 'staff', providerId: 'google' | 'github') => {
    const provider = providerId === 'google' ? googleProvider : githubProvider;
    
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;

    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const existingData = userSnap.data() as User;
      
      // Enforce institute active status verification
      if (existingData.role === 'institute') {
        if (existingData.status === 'pending') {
          await auth.signOut();
          throw new Error('pending_verification');
        } else if (existingData.status !== 'active') {
          await auth.signOut();
          throw new Error('access_denied');
        }
      }

      // Enforce staff allow-list for existing staff users as well
      if (existingData.role === 'staff') {
        const email = firebaseUser.email?.toLowerCase();
        if (!email) {
          await auth.signOut();
          throw new Error('access_denied');
        }
        try {
          const staffQ = query(collection(db, 'staff'), where('email', '==', email));
          const staffSnap = await getDocs(staffQ);
          if (staffSnap.empty) {
            await auth.signOut();
            throw new Error('access_denied');
          }
        } catch (err: any) {
          if (err.message === 'access_denied') throw err;
          console.warn('Could not verify staff allowlist:', err);
        }
      }
      
      // onSnapshot will pick up the existing data and call setUser
    } else {
      // Check if they've been pre-allow-listed as an admin
      let isPreApprovedAdmin = false;
      try {
        const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
        isPreApprovedAdmin = adminSnap.exists() && (adminSnap.data()?.role === 'super_admin' || adminSnap.data()?.role === 'admin' || adminSnap.data()?.pendingRole === 'admin');
      } catch (err) {
        console.warn('Admin status check skipped or restricted:', err);
      }

      // Check staff allow-list by email (admin can add staff by email)
      let isPreApprovedStaff = false;
      if (firebaseUser.email) {
        try {
          const staffQ = query(collection(db, 'staff'), where('email', '==', firebaseUser.email.toLowerCase()));
          const staffSnap = await getDocs(staffQ);
          if (!staffSnap.empty) {
            isPreApprovedStaff = true;
          }
        } catch (err) {
          console.warn('Staff allowlist check skipped or restricted:', err);
        }
      }

      let finalRole: 'student' | 'admin' | 'institute' | 'staff';

      if (isPreApprovedAdmin) {
        finalRole = 'admin';
      } else if (role === 'admin') {
        // Non-pre-approved user trying to sign up as admin
        await auth.signOut();
        throw new Error('access_denied');
      } else if (role === 'staff') {
        if (!isPreApprovedStaff) {
          await auth.signOut();
          throw new Error('access_denied');
        }
        finalRole = 'staff';
      } else if (isPreApprovedStaff) {
        finalRole = 'staff';
      } else {
        finalRole = role as any;
      }

      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'New User',
        photoURL: firebaseUser.photoURL || '',
        role: finalRole,
        status: finalRole === 'institute' ? 'pending' : 'active',
      };

      await setDoc(userRef, {
        ...newUser,
        createdAt: serverTimestamp()
      });

      // If they were pre-approved, clear the pendingRole flag from the admins doc
      if (isPreApprovedAdmin) {
        try {
          await updateDoc(doc(db, 'admins', firebaseUser.uid), { pendingRole: null });
        } catch (err) {
          console.warn('Could not update pendingRole on admins doc:', err);
        }
      }

      if (finalRole === 'institute') {
        await auth.signOut();
        throw new Error('pending_verification');
      }

      // onSnapshot will pick up the newly created doc and call setUser
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      await updateDoc(doc(db, 'users', user.uid), data);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithOAuth, logout, updateProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
