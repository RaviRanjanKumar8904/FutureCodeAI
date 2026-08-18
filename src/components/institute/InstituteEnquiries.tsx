import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Clock, Search, Filter } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

interface Enquiry {
  id: string;
  name: string;
  contact: string;
  email: string;
  interest: string;
  date: string;
  status: 'New' | 'Contacted' | 'Enrolled' | 'Closed';
}

function formatEnquiryDate(createdAt: any, fallbackDate?: string): string {
  if (!createdAt) return fallbackDate || 'N/A';
  try {
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    if (typeof createdAt === 'string') {
      const parsed = new Date(createdAt);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    }
  } catch (err) {
    console.error("Error formatting enquiry date:", err);
  }
  return fallbackDate || 'N/A';
}

export default function InstituteEnquiries() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(
      collection(db, 'enquiries'), 
      where('instituteId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedData = snapshot.docs.map(doc => {
          const data = doc.data();
          const rawStatus = (data.status || 'New').toString();
          const normalizedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
          return {
            id: doc.id,
            name: data.name || 'Unknown Lead',
            contact: data.contact || data.phone || 'N/A',
            email: data.email || 'N/A',
            interest: data.interest || data.targetTitle || 'General Enquiry',
            date: formatEnquiryDate(data.createdAt, data.date),
            status: (['New', 'Contacted', 'Enrolled', 'Closed'].includes(normalizedStatus) ? normalizedStatus : 'New') as any,
            ...data
          };
        }) as Enquiry[];

        setEnquiries(fetchedData);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to institute enquiries:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  const filteredEnquiries = enquiries.filter(enq => 
    (enq.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (enq.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-text-heading">Lead Enquiries</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Students inquiring about courses at your institute.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search leads..." 
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-sm font-bold text-slate-600">
                <th className="p-4 pl-6 whitespace-nowrap">Lead Name</th>
                <th className="p-4 whitespace-nowrap">Contact Details</th>
                <th className="p-4 whitespace-nowrap">Interested In</th>
                <th className="p-4 whitespace-nowrap">Received On</th>
                <th className="p-4 pr-6 whitespace-nowrap text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    <div className="flex justify-center items-center gap-3">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading enquiries...
                    </div>
                  </td>
                </tr>
              ) : filteredEnquiries.length > 0 ? (
                filteredEnquiries.map((enq, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={enq.id} 
                    className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4 pl-6 font-bold text-text-heading">{enq.name || 'Unknown'}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Phone size={14} className="text-slate-400"/> {enq.contact || 'N/A'}</span>
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><Mail size={14} className="text-slate-400"/> {enq.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-bold text-primary bg-primary/5 rounded-lg inline-block mt-3 ml-2">{enq.interest || 'N/A'}</td>
                    <td className="p-4 text-sm font-medium text-slate-500">
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {enq.date || 'N/A'}</span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        enq.status === 'New' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                        enq.status === 'Contacted' ? 'bg-blue-100 text-blue-700' :
                        enq.status === 'Enrolled' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {enq.status || 'Pending'}
                      </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    {searchTerm ? 'No enquiries found matching your search.' : 'No enquiries have been received yet.'}
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
