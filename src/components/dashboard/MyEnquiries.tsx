import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface Enquiry {
  id: string;
  targetTitle: string;
  type: 'course' | 'internship';
  status: 'new' | 'contacted' | 'enrolled' | 'closed';
  createdAt: string;
}

export default function MyEnquiries() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.email) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const userEmailClean = user.email.toLowerCase().trim();
    const q = query(collection(db, 'enquiries'), where('email', '==', userEmailClean));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          let createdAtStr = 'Unknown';
          if (docData.createdAt && docData.createdAt.toDate) {
            createdAtStr = docData.createdAt.toDate().toLocaleDateString();
          }
          return {
            id: doc.id,
            targetTitle: docData.targetTitle,
            type: docData.type,
            status: docData.status,
            createdAt: createdAtStr
          };
        }) as Enquiry[];
        setEnquiries(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to enquiries:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (enquiries.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <MessageSquare size={32} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-text-heading mb-3">No Enquiries Yet</h2>
        <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">
          You haven't made any enquiries. Have questions about our programs? Browse courses and click "Enquire Now".
        </p>
        <Link 
          to="/programs" 
          className="bg-primary text-white px-8 py-3.5 rounded-xl font-bold shadow-glow-primary hover:bg-indigo-600 transition-colors flex items-center gap-2"
        >
          Browse Programs
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">New</span>;
      case 'contacted': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Contacted</span>;
      case 'enrolled': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Enrolled</span>;
      case 'closed': return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Closed</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-text-heading mb-6">My Enquiries</h2>
      <div className="grid gap-4">
        {enquiries.map((enquiry, idx) => (
          <motion.div 
            key={enquiry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/20 transition-colors"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded">
                  {enquiry.type}
                </span>
                <h3 className="font-bold text-lg text-text-heading">{enquiry.targetTitle}</h3>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarDays size={16} />
                Submitted on: {enquiry.createdAt}
              </div>
            </div>
            
            <div className="flex items-center">
              {getStatusBadge(enquiry.status)}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
