import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Users 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { parseCSV, downloadTemplateCSV, resolveHeaderValue } from '../../utils/csv';
import { logAdminActivity } from '../../utils/adminLogger';
import { sendNotification } from '../../utils/notificationService';

interface ParsedStudentRow {
  studentName: string;
  email: string;
  phone?: string;
  courseName: string;
  batch?: string;
  rollNo?: string;
  gender?: 'Male' | 'Female' | string;
  collegeName?: string;
}

interface InstituteCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InstituteCsvImportModal({
  isOpen,
  onClose,
  onSuccess,
}: InstituteCsvImportModalProps) {
  const { user } = useAuth();
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  const centerName = user.instituteDetails?.centerName || user.school || user.displayName || 'Partner Institute';

  const handleDownloadSampleCsv = () => {
    const headers = [
      'Student Name',
      'Email',
      'Phone',
      'Course Name',
      'Batch',
      'Roll Number',
      'Gender'
    ];
    const sampleRows = [
      ['Rohan Sharma', 'rohan.sharma@example.com', '9876543210', 'Full Stack Web Development', 'Morning Batch A', 'CS-2026-01', 'Male'],
      ['Ananya Patel', 'ananya.patel@example.com', '9876543211', 'AI & Machine Learning Track', 'Evening Batch B', 'CS-2026-02', 'Female'],
      ['Vikram Singh', 'vikram.singh@example.com', '9876543212', 'Data Analytics & Python', 'Weekend Cohort', 'CS-2026-03', 'Male'],
    ];

    downloadTemplateCSV(`institute_students_template_${centerName.toLowerCase().replace(/\s+/g, '_')}`, headers, sampleRows);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid .csv file format');
      return;
    }

    parseCSV(file, (rows: any[]) => {
      const parsed: ParsedStudentRow[] = [];

      for (const row of rows) {
        const name = resolveHeaderValue(row, ['studentName', 'name', 'student', 'fullName', 'candidateName']);
        const email = resolveHeaderValue(row, ['email', 'emailAddress', 'studentEmail', 'mail']);
        const phone = resolveHeaderValue(row, ['phone', 'contact', 'mobile', 'phoneNumber', 'telephone']);
        const course = resolveHeaderValue(row, ['courseName', 'course', 'program', 'specialization', 'track']);
        const batch = resolveHeaderValue(row, ['batch', 'cohort', 'timing', 'batchTiming']);
        const rollNo = resolveHeaderValue(row, ['rollNo', 'rollNumber', 'studentId', 'roll']);
        const gender = resolveHeaderValue(row, ['gender', 'sex']);
        const college = resolveHeaderValue(row, ['collegeName', 'college', 'institute', 'school']);

        if (!name && !email) continue;

        parsed.push({
          studentName: name || 'Student',
          email: (email || `${(name || 'student').toLowerCase().replace(/\s+/g, '')}@student.local`).toLowerCase().trim(),
          phone: phone || '',
          courseName: course || 'General Curriculum Track',
          batch: batch || 'Standard Batch',
          rollNo: rollNo || '',
          gender: gender?.toLowerCase() === 'female' ? 'Female' : 'Male',
          collegeName: college || centerName,
        });
      }

      if (parsed.length === 0) {
        toast.error('No valid student rows found in CSV. Please verify column headers.');
        return;
      }

      setParsedRows(parsed);
      toast.success(`Parsed ${parsed.length} student records from CSV!`);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    const toastId = toast.loading(`Enrolling ${parsedRows.length} students for ${centerName}…`);

    try {
      const BATCH_LIMIT = 450;
      for (let i = 0; i < parsedRows.length; i += BATCH_LIMIT) {
        const chunk = parsedRows.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);

        for (const row of chunk) {
          // 1. Create enrollment document strictly scoped to this institute
          const enrollRef = doc(collection(db, 'enrollments'));
          batch.set(enrollRef, {
            instituteId: user.uid,
            institute: centerName,
            assignedCenter: centerName,
            studentName: row.studentName,
            studentEmail: row.email,
            phone: row.phone || '',
            courseName: row.courseName,
            batch: row.batch || 'Standard',
            batchTiming: row.batch || 'Standard',
            rollNo: row.rollNo || '',
            gender: row.gender || 'Male',
            collegeName: row.collegeName || centerName,
            status: 'Active',
            enrolledAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            importedByInstitute: user.email || 'Institute Partner',
          });

          // 2. Optionally register/upsert student user document
          const userRef = doc(collection(db, 'users'));
          batch.set(
            userRef,
            {
              displayName: row.studentName,
              email: row.email,
              phone: row.phone || '',
              gender: row.gender || 'Male',
              collegeName: row.collegeName || centerName,
              school: centerName,
              assignedCenter: centerName,
              rollNo: row.rollNo || '',
              enrolledCourse: row.courseName,
              batch: row.batch || '',
              role: 'student',
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        await batch.commit();
      }

      // Log admin activity so administrators can see the institute bulk import
      await logAdminActivity(
        user.email,
        'INSTITUTE_CSV_IMPORT',
        `Institute Bulk Import (${centerName})`,
        `Successfully enrolled ${parsedRows.length} students via CSV for center "${centerName}"`
      );

      // In-app notification for the institute
      if (user.email) {
        sendNotification({
          userEmail: user.email,
          title: 'Bulk Enrollment Completed 👥',
          message: `Successfully enrolled ${parsedRows.length} students into your center roster.`,
          type: 'system',
          link: '/dashboard/institute',
        });
      }

      toast.success(`Successfully enrolled ${parsedRows.length} students for ${centerName}!`, { id: toastId });
      setParsedRows([]);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error importing students:', err);
      toast.error('Failed to import students. Please try again.', { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  Bulk CSV Student Enrollment
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Center: <strong className="text-primary">{centerName}</strong> (Records are automatically scoped to your institute)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs sm:text-sm">
            {/* Download Template Banner */}
            <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-sky-950 text-xs">
                    Need the formatted student CSV template?
                  </p>
                  <p className="text-[11px] text-sky-800 font-medium">
                    Ensure headers include: Student Name, Email, Course Name, Batch, Phone.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sky-300 text-sky-900 font-bold text-xs hover:bg-sky-100/50 transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <Download size={14} />
                <span>Download Sample CSV</span>
              </button>
            </div>

            {/* Drop Zone */}
            {parsedRows.length === 0 ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-primary bg-primary/5 scale-[0.99]'
                    : 'border-slate-300 hover:border-primary/60 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Upload size={26} />
                </div>
                <p className="font-extrabold text-slate-800 text-sm sm:text-base">
                  Click to upload or drag and drop student CSV
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Supports .csv files with standard header columns
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span className="font-extrabold text-slate-900">
                      Ready to Import: {parsedRows.length} Students
                    </span>
                  </div>
                  <button
                    onClick={() => setParsedRows([])}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Clear &amp; Upload Different File
                  </button>
                </div>

                {/* Preview Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Course Program</th>
                        <th className="py-2.5 px-3">Batch</th>
                        <th className="py-2.5 px-3 text-right">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{r.studentName}</td>
                          <td className="py-2 px-3 text-slate-600">{r.email}</td>
                          <td className="py-2 px-3 font-medium text-slate-700">{r.courseName}</td>
                          <td className="py-2 px-3 text-slate-500">{r.batch || 'Standard'}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{r.phone || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Users size={14} className="text-primary" />
              <span>Assigned Center: <strong>{centerName}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedRows.length === 0 || importing}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Upload size={14} />
                <span>{importing ? 'Enrolling Students...' : `Confirm & Enroll (${parsedRows.length})`}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
