import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export type AdminActionType = 
  | 'CREATED' 
  | 'UPDATED' 
  | 'DELETED' 
  | 'STATUS_CHANGE' 
  | 'BULK_ACTION' 
  | 'INVITE' 
  | 'ISSUED' 
  | 'BULK_DELETED' 
  | 'BULK_ISSUED';

export async function logAdminActivity(
  adminEmail: string | null | undefined,
  action: AdminActionType,
  target: string,
  details?: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'adminLogs'), {
      adminEmail: adminEmail || 'Admin',
      action,
      target,
      details: details || '',
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // Non-blocking error logging for audit logs
    console.warn('[AdminLogger] Failed to record audit log:', error);
  }
}
