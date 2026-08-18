import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Clock, CalendarDays } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { DashboardSkeleton, DashboardError } from '../layout/DashboardState';

interface Batch {
  id: string;
  courseName: string;
  batchId: string;
  timing: string;
  startDate: string;
  capacity: number;
  filled: number;
  status: 'Active' | 'Upcoming' | 'Completed';
}

export default function InstituteCourses() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    try {
      const q = query(
        collection(db, 'courses'), 
        where('instituteId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const fetchedData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          courseName: data.courseName || data.title || 'Unnamed Course',
          batchId: data.batchId || (data.title ? `${data.title.substring(0, 3).toUpperCase()}-101` : 'BATCH-101'),
          timing: data.timing || data.batchTimings || 'Flexible',
          startDate: data.startDate || 'Immediate',
          capacity: data.capacity || data.totalSeats || 50,
          filled: data.filled || data.filledSeats || data.studentsCount || 0,
          status: data.status || (data.isActive !== false ? 'Active' : 'Upcoming'),
          ...data
        };
      }) as Batch[];
      
      setBatches(fetchedData);
      setError(null);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load institute courses & batches. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-text-heading">Courses &amp; Batches</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Loading assigned course batches...</p>
        </div>
        <DashboardSkeleton type="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <DashboardError
        title="Unable to load batches"
        message={error}
        onRetry={fetchCourses}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-text-heading">Courses &amp; Batches</h2>
        <p className="text-slate-500 font-medium text-sm mt-1">Track seat capacities and timings for your institute's active batches.</p>
      </div>

      {batches.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center text-slate-500 font-medium">
          No courses have been assigned to this institute yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch, idx) => {
            const capacity = batch.capacity || 1;
            const filled = batch.filled || 0;
            const percentFilled = Math.round((filled / capacity) * 100);
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={batch.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-full hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen size={24} className="text-primary" />
                  </div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    batch.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                    batch.status === 'Upcoming' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {batch.status || 'Draft'}
                  </span>
                </div>
                
                <h3 className="font-extrabold text-lg text-text-heading mb-1 line-clamp-2 leading-tight">
                  {batch.courseName || 'Unnamed Course'}
                </h3>
                <p className="text-xs font-bold text-primary mb-4 bg-primary/5 inline-block px-2 py-1 rounded-md self-start">
                  Batch ID: {batch.batchId || 'N/A'}
                </p>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <CalendarDays size={16} className="text-slate-400" />
                    Starts: {batch.startDate || 'TBD'}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Clock size={16} className="text-slate-400" />
                    {batch.timing || 'TBD'}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-50">
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <Users size={16} className="text-slate-400" />
                      Seats Filled
                    </span>
                    <span className={percentFilled >= 100 ? 'text-red-600' : 'text-primary'}>
                      {filled} / {capacity}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        percentFilled >= 100 ? 'bg-red-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(percentFilled, 100)}%` }}
                    />
                  </div>
                  {percentFilled >= 100 && (
                    <p className="text-xs text-red-600 font-bold mt-2">Batch Full</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
