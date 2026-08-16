import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ShieldAlert } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

interface EnrolledStudent {
  id: string;
  studentName?: string;
  name?: string;
  courseName?: string;
  course?: string;
  batch?: string;
  enrolledAt?: any;
  date?: string;
  status?: 'Active' | 'Ongoing' | 'Completed' | 'Dropped' | string;
}

function formatEnrolledDate(enrolledAt: any, fallbackDate?: string): string {
  if (!enrolledAt) return fallbackDate || 'N/A';
  try {
    if (typeof enrolledAt.toDate === 'function') {
      return enrolledAt.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    if (enrolledAt.seconds) {
      return new Date(enrolledAt.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    if (typeof enrolledAt === 'string') {
      const parsed = new Date(enrolledAt);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    }
  } catch (err) {
    console.error("Error formatting date:", err);
  }
  return fallbackDate || 'N/A';
}

export default function InstituteStudents() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, 'enrollments'), 
          where('instituteId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const fetchedData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            studentName: data.studentName || data.name || 'Unknown Student',
            courseName: data.courseName || data.course || 'N/A',
            batch: data.batch || data.batchTiming || 'N/A',
            enrolledAt: data.enrolledAt,
            date: formatEnrolledDate(data.enrolledAt, data.date),
            status: data.status || 'Active',
            ...data
          };
        }) as EnrolledStudent[];
        
        setStudents(fetchedData);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user]);

  const filteredStudents = students.filter(s => {
    const name = (s.studentName || s.name || '').toLowerCase();
    const course = (s.courseName || s.course || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || course.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-text-heading">Enrolled Students</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Read-only view of students registered through your institute.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full md:w-64"
            />
          </div>
          <button className="flex items-center justify-center p-2 bg-white border border-gray-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
        <ShieldAlert size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm font-medium">
          <strong>Data Privacy Notice:</strong> This is a read-only view. You cannot edit, delete, or modify student records from this portal. Certificate generation is handled directly by FutureCodeAI administrators.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-sm font-bold text-slate-600">
                <th className="p-4 pl-6 whitespace-nowrap">Student Name</th>
                <th className="p-4 whitespace-nowrap">Course Program</th>
                <th className="p-4 whitespace-nowrap">Batch</th>
                <th className="p-4 whitespace-nowrap">Enrollment Date</th>
                <th className="p-4 pr-6 whitespace-nowrap text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    <div className="flex justify-center items-center gap-3">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading students...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={student.id} 
                    className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4 pl-6 font-bold text-text-heading">{student.studentName || student.name || 'Unknown'}</td>
                    <td className="p-4 text-sm font-medium text-slate-600">{student.courseName || student.course || 'N/A'}</td>
                    <td className="p-4 text-sm font-medium text-slate-500">{student.batch || 'N/A'}</td>
                    <td className="p-4 text-sm font-medium text-slate-500">{student.date || 'N/A'}</td>
                    <td className="p-4 pr-6 text-right">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        student.status === 'Active' || student.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                        student.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        student.status === 'Dropped' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {student.status || 'Active'}
                      </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    {searchTerm ? 'No students found matching your search.' : 'No students have been enrolled yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
