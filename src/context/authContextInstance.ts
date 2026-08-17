import { createContext } from 'react';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'student' | 'admin' | 'institute' | 'staff';
  status?: 'active' | 'pending_verification' | 'pending' | 'inactive';
  phone?: string;
  contactPerson?: string;
  description?: string;
  school?: string;
  collegeName?: string;
  rollNo?: string;
  enrolledCourse?: string;
  assignedCenter?: string;
  batch?: string;
  city?: string;
  degree?: string;
  yearOfStudy?: string;
  instituteDetails?: {
    centerName: string;
    city: string;
    address: string;
    isApproved: boolean;
    contactNumber?: string;
  };
  bio?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  nameChanged?: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithOAuth: (role: 'student' | 'admin' | 'institute' | 'staff', providerId: 'google' | 'github') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
