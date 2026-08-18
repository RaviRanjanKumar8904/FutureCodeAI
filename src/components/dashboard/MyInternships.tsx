import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, ArrowRight, CheckCircle2, Building2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface InternshipApplication {
  id: string;
  role: string;
  company: string; // Internal or Partner
  status: 'Applied' | 'Screening' | 'Interview' | 'Ongoing' | 'Completed' | string;
  appliedDate: string;
  source?: string;
  certificateId?: string;
}

import { matchesUser } from '../../utils/matchesUser';
import { DashboardSkeleton, DashboardError } from '../layout/DashboardState';

export default function MyInternships() {
  const { user } = useAuth();
  const [internships, setInternships] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInternships = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userEmailClean = (user.email || '').toLowerCase().trim();
        const [appSnap, appEmailSnap, appUidSnap, enquirySnap, certSnap, certUidSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, 'internshipApplications'), where('studentEmail', '==', userEmailClean))),
          getDocs(query(collection(db, 'internshipApplications'), where('email', '==', userEmailClean))),
          user.uid ? getDocs(query(collection(db, 'internshipApplications'), where('studentId', '==', user.uid))) : Promise.resolve(null),
          getDocs(query(collection(db, 'enquiries'), where('email', '==', userEmailClean))),
          getDocs(query(collection(db, 'certificates'), where('studentEmail', '==', userEmailClean))),
          user.uid ? getDocs(query(collection(db, 'certificates'), where('studentId', '==', user.uid))) : Promise.resolve(null),
          getDocs(query(collection(db, 'users'), where('email', '==', userEmailClean))),
        ]);

        const appMap = new Map<string, any>();
        [...appSnap.docs, ...appEmailSnap.docs, ...(appUidSnap ? appUidSnap.docs : [])].forEach((d: any) => appMap.set(d.id, { id: d.id, ...d.data() }));
        const allApps: any[] = Array.from(appMap.values());

        const certMap = new Map<string, any>();
        [...certSnap.docs, ...(certUidSnap ? certUidSnap.docs : [])].forEach((d: any) => certMap.set(d.id, { id: d.id, ...d.data() }));
        const allCerts: any[] = Array.from(certMap.values());

        const allEnquiries: any[] = enquirySnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allUsers: any[] = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const combined: InternshipApplication[] = [];
        const seenRoles = new Set<string>();

        // 1. From internshipApplications collection
        allApps.forEach(data => {
          if (matchesUser(user, data.studentEmail || data.email || data.applicantEmail, data.studentName || data.name, data.studentId)) {
            const roleName = data.role || data.title || 'Tech Internship Track';
            const key = roleName.toLowerCase();
            if (!seenRoles.has(key)) {
              seenRoles.add(key);
              combined.push({
                id: data.id,
                role: roleName,
                company: data.company || 'FutureCode AI Partner Network',
                status: data.status || 'Applied',
                appliedDate: data.appliedDate || data.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || new Date().toISOString().split('T')[0],
                source: 'application',
              });
            }
          }
        });

        // 2. From enquiries (where type === 'internship')
        allEnquiries.forEach(data => {
          if (data.type === 'internship' && matchesUser(user, data.email, data.name, (data as any).studentId)) {
            const roleName = data.targetTitle || data.role || 'Industry Internship';
            const key = roleName.toLowerCase();
            if (!seenRoles.has(key)) {
              seenRoles.add(key);
              combined.push({
                id: `enquiry-${data.id}`,
                role: roleName,
                company: 'FutureCode AI Labs',
                status: data.status === 'resolved' || data.status === 'enrolled' ? 'Ongoing' : 'Applied',
                appliedDate: data.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || new Date().toISOString().split('T')[0],
                source: 'enquiry',
              });
            }
          }
        });

        // 3. From users collection (if profile has internship field)
        allUsers.forEach(data => {
          if (matchesUser(user, data.email, data.displayName, data.id)) {
            if (data.enrolledInternship || data.internshipRole) {
              const roleName = data.enrolledInternship || data.internshipRole;
              const key = roleName.toLowerCase();
              if (!seenRoles.has(key)) {
                seenRoles.add(key);
                combined.push({
                  id: `user-internship-${data.id}`,
                  role: roleName,
                  company: 'FutureCode AI Incubator',
                  status: 'Ongoing',
                  appliedDate: data.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || new Date().toISOString().split('T')[0],
                  source: 'profile',
                });
              }
            }
          }
        });

        // 4. Match completed certificates for internships
        allCerts.forEach(cert => {
          if (!cert.revoked && matchesUser(user, cert.studentEmail, cert.studentName, cert.studentId)) {
            const cName = cert.courseName || cert.domain || '';
            if (cName.toLowerCase().includes('internship') || (cert.domain && cert.domain.toLowerCase().includes('internship'))) {
              const key = cName.toLowerCase();
              const existing = combined.find(item => item.role.toLowerCase() === key || item.company.toLowerCase().includes('futurecode'));
              if (existing) {
                existing.status = 'Completed';
                existing.certificateId = cert.certificateId || cert.id;
              } else if (!seenRoles.has(key)) {
                seenRoles.add(key);
                combined.push({
                  id: `cert-intern-${cert.id}`,
                  role: cName,
                  company: 'FutureCode AI Verified Internship',
                  status: 'Completed',
                  appliedDate: cert.startDate || cert.issueDate || new Date().toISOString().split('T')[0],
                  certificateId: cert.certificateId || cert.id,
                  source: 'certificate',
                });
              }
            }
          }
        });

        setInternships(combined);
        setError(null);
      } catch (err) {
        console.error("Error fetching internships:", err);
        setError("Failed to load your internship applications. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchInternships();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded-xl w-48 animate-pulse mb-6" />
        <DashboardSkeleton type="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <DashboardError
        title="Unable to load internships"
        message={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
        }}
      />
    );
  }

  if (internships.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <Briefcase size={32} className="text-indigo-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-text-heading mb-3">No Internships Found</h2>
        <p className="text-slate-500 font-medium max-w-md mx-auto mb-8 text-sm">
          You haven't been enrolled in any internship track yet. Gain real-world industry experience and stipend opportunities by applying to our open domains.
        </p>
        <Link 
          to="/internships" 
          className="bg-primary text-white px-8 py-3.5 rounded-xl font-bold shadow-glow-primary hover:bg-indigo-600 transition-colors flex items-center gap-2"
        >
          Explore Internships
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ongoing': return 'text-primary bg-primary/10 border border-primary/20';
      case 'Completed': return 'text-emerald-700 bg-emerald-100 border border-emerald-300';
      case 'Interview': return 'text-indigo-700 bg-indigo-100 border border-indigo-200';
      case 'Applied': return 'text-amber-700 bg-amber-100 border border-amber-200';
      default: return 'text-slate-700 bg-slate-100 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-heading tracking-tight">My Internships</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Active internships, industry allocations, and application milestones.
          </p>
        </div>

        <Link
          to="/internships"
          className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-indigo-700 bg-primary/5 hover:bg-primary/10 px-4 py-2.5 rounded-xl transition-all self-start sm:self-auto"
        >
          <span>Explore More Openings</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid gap-4">
        {internships.map((internship, idx) => (
          <motion.div 
            key={internship.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs hover:border-indigo-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Briefcase size={16} />
                </span>
                <h3 className="font-extrabold text-lg text-text-heading leading-snug">{internship.role}</h3>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm font-medium flex items-center gap-1.5 pl-10">
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <span>{internship.company}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Calendar size={14} className="text-slate-400" />
                <span>Date: {internship.appliedDate}</span>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 ${getStatusColor(internship.status)}`}>
                {internship.status === 'Completed' && <CheckCircle2 size={14} />}
                <span>{internship.status}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
