import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export type NotificationType = 'attendance' | 'certificate' | 'enquiry' | 'webinar' | 'system';

export interface AppNotification {
  id?: string;
  userId?: string;
  userEmail: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  createdAt?: any;
}

/**
 * Send an in-app notification to a user by email and/or userId.
 * Gracefully logs without crashing UI if rules or offline issues occur.
 */
export async function sendNotification(notification: {
  userId?: string;
  userEmail: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}): Promise<void> {
  if (!notification.userEmail) return;

  try {
    await addDoc(collection(db, 'notifications'), {
      userId: notification.userId || '',
      userEmail: notification.userEmail.toLowerCase().trim(),
      title: notification.title,
      message: notification.message,
      type: notification.type || 'system',
      link: notification.link || '',
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('[NotificationService] Failed to dispatch in-app notification:', error);
  }
}
