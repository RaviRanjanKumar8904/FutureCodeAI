import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import SEO from '../components/SEO';
import { db } from '../firebase/config';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Building2, 
  GraduationCap, 
  MapPin, 
  Users, 
  ArrowRight,
  X,
  Send,
  CheckCircle2,
  Phone,
  Mail,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

interface Collaborator {
  id: string;
  name: string;
  type: 'Coaching Institute' | 'College';
  city: string;
  logoUrl: string;
  description: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  galleryUrls?: string[];
  isApproved: boolean;
  isActive: boolean;
}

const CATEGORIES = ["All", "Coaching Institutes", "Colleges"];

const partnershipSchema = z.object({
  name: z.string().min(2, "Name is required"),
  instituteName: z.string().min(2, "Institute Name is required"),
  city: z.string().min(2, "City is required"),
  type: z.enum(['Coaching Institute', 'College']),
  phone: z.string()
    .regex(/^[0-9+\-\s()]*$/, "Invalid characters in phone number")
    .refine(val => (val.match(/\d/g) || []).length >= 10, {
      message: "Valid phone number required (at least 10 digits)"
    }),
  email: z.string().email("Valid email required"),
  message: z.string().min(10, "Message required"),
});

type PartnershipFormValues = z.infer<typeof partnershipSchema>;

export default function Collaborators() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  
  const [selectedCollab, setSelectedCollab] = useState<Collaborator | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PartnershipFormValues>({
    resolver: zodResolver(partnershipSchema),
    defaultValues: { type: 'Coaching Institute' }
  });

  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        const q = query(
          collection(db, 'collaborators'),
          where('isApproved', '==', true),
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setCollaborators([]);
        } else {
          const fetchedData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Collaborator[];
          setCollaborators(fetchedData);
        }
      } catch (error) {
        console.error("Error fetching collaborators:", error);
        setCollaborators([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCollaborators();
  }, []);

  const filteredData = collaborators.filter(item => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Coaching Institutes" && item.type === "Coaching Institute") return true;
    if (activeCategory === "Colleges" && item.type === "College") return true;
    return false;
  });

  const onSubmitForm = async (data: PartnershipFormValues) => {
    try {
      await addDoc(collection(db, 'partnershipEnquiries'), {
        ...data,
        status: 'new',
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
      reset();
      toast.success("Partnership enquiry sent!");
      setTimeout(() => {
        setIsSuccess(false);
        setIsFormOpen(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit. Please try again.");
    }
  };

  return (
    <div className="pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-20 font-body min-h-screen relative bg-slate-50 overflow-hidden">
      <SEO 
        title="Our Collaborators & Partners" 
        description="Discover the universities, colleges, and industry partners collaborating with FutureCodeAI to deliver top-tier education."
      />
      <Toaster position="top-center" />
      
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/5 via-indigo-500/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              Authorized Network
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-text-heading mb-4 tracking-tight leading-tight">
              Trusted by Leading <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                Institutes &amp; Colleges
              </span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
              We partner with forward-thinking educational institutions to bring industry-leading tech curriculum directly to their campuses.
            </p>
          </motion.div>
        </div>

        {/* Filter Tabs (Horizontal Scrollable on Mobile) */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 mb-10 sm:mb-16 scrollbar-none">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 cursor-pointer active:scale-95 shrink-0 ${
                activeCategory === category 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-100' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-16 sm:mb-24"
          >
            <AnimatePresence>
              {filteredData.map((collab) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={collab.id}
                  className="group"
                >
                  <div 
                    onClick={() => setSelectedCollab(collab)}
                    className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-gray-100 cursor-pointer h-full flex flex-col justify-between hover:shadow-xl transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <img 
                          src={collab.logoUrl || '/logo.jpg'} 
                          alt={collab.name} 
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover bg-slate-50 border border-gray-100 shadow-sm shrink-0"
                        />
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-lg border border-gray-100">
                          {collab.type === 'College' ? <GraduationCap size={13} /> : <Building2 size={13} />}
                          {collab.type}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-extrabold text-text-heading mb-1.5 line-clamp-1 leading-snug">
                        {collab.name}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-3">
                        <MapPin size={13} className="text-primary shrink-0" />
                        <span className="truncate">{collab.city}</span>
                      </div>
                      
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-2">
                        {collab.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs bg-indigo-50 px-2.5 py-1 rounded-lg">
                        <BookOpen size={13} />
                        <span>Active Courses</span>
                      </div>
                      
                      <span className="text-xs font-bold text-slate-500 group-hover:text-primary flex items-center gap-1 transition-colors">
                        <span>Details</span>
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filteredData.length === 0 && !loading && (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 mb-16 shadow-sm">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-700 font-bold text-lg">No collaborators found</p>
            <p className="text-slate-500 text-xs mt-1">Try selecting a different category filter above.</p>
          </div>
        )}

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 md:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl sm:text-4xl font-heading font-extrabold text-white">
              Become an Authorized Center
            </h2>
            <p className="text-slate-300 text-xs sm:text-base font-medium max-w-xl mx-auto leading-relaxed">
              Join our network of prestigious educational institutions and empower your students with cutting-edge tech education.
            </p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-white hover:bg-slate-100 text-slate-900 px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm transition-all shadow-xl flex items-center gap-2 mx-auto active:scale-95 cursor-pointer"
            >
              <span>Partner With Us</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* Collaborator Detail Modal */}
      <AnimatePresence>
        {selectedCollab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCollab(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto z-[1000]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto max-h-[90vh] flex flex-col"
            >
              <button 
                onClick={() => setSelectedCollab(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="overflow-y-auto p-5 sm:p-8 flex-1 space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                  <img 
                    src={selectedCollab.logoUrl || '/logo.jpg'} 
                    alt={selectedCollab.name} 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-slate-50 border border-gray-100 shadow-sm shrink-0"
                  />
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg border border-gray-100 mb-2">
                      {selectedCollab.type === 'College' ? <GraduationCap size={13} /> : <Building2 size={13} />}
                      {selectedCollab.type}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-text-heading mb-1.5">{selectedCollab.name}</h2>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{selectedCollab.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address &amp; Location</h4>
                  <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-gray-100 text-xs sm:text-sm text-slate-700 font-medium">
                    <MapPin className="text-primary shrink-0 mt-0.5" size={17} />
                    <span>{selectedCollab.address}</span>
                  </div>
                </div>

                {selectedCollab.contactPerson && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Person</h4>
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-100 space-y-2 text-xs sm:text-sm">
                      <p className="text-slate-800 font-bold">{selectedCollab.contactPerson}</p>
                      {selectedCollab.phone && (
                        <a href={`tel:${selectedCollab.phone}`} className="flex items-center gap-2 text-primary font-semibold hover:underline">
                          <Phone size={14}/> {selectedCollab.phone}
                        </a>
                      )}
                      {selectedCollab.email && (
                        <a href={`mailto:${selectedCollab.email}`} className="flex items-center gap-2 text-slate-600 hover:text-primary">
                          <Mail size={14}/> {selectedCollab.email}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-slate-50 flex items-center justify-between shrink-0">
                <span className="text-slate-500 font-medium text-xs">Ready to join this center?</span>
                <Link 
                  to={`/programs?institute=${selectedCollab.id}`}
                  className="bg-primary text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-600 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>View Courses</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partnership Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto z-[1000]"
            onClick={() => !isSubmitting && setIsFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative my-auto p-4 sm:p-8 max-h-[92dvh] overflow-y-auto scrollbar-none border border-gray-100"
            >
              <button 
                onClick={() => !isSubmitting && setIsFormOpen(false)}
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer active:scale-90"
              >
                <X size={18} />
              </button>

              <AnimatePresence>
                {isSuccess && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center text-center p-6"
                  >
                    <CheckCircle2 size={56} className="text-emerald-500 mb-3" />
                    <h3 className="text-xl font-extrabold text-text-heading mb-2">Request Submitted!</h3>
                    <p className="text-slate-600 font-medium text-xs sm:text-sm">Thank you for your interest. Our partnership team will contact you shortly.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <h2 className="text-lg sm:text-2xl font-extrabold text-text-heading mb-1 pr-8">Partner with Us</h2>
              <p className="text-slate-500 mb-4 sm:mb-6 font-medium text-xs sm:text-sm">Fill out the details below and our team will get in touch.</p>

              <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-3.5 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Your Name</label>
                    <input {...register("name")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base" />
                    {errors.name && <p className="text-red-500 text-[11px] mt-0.5 font-medium">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Institute / College Name</label>
                    <input {...register("instituteName")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base" />
                    {errors.instituteName && <p className="text-red-500 text-[11px] mt-0.5 font-medium">{errors.instituteName.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Institution Type</label>
                    <select {...register("type")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium bg-white text-xs sm:text-base">
                      <option value="Coaching Institute">Coaching Institute</option>
                      <option value="College">College</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City</label>
                    <input {...register("city")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base" />
                    {errors.city && <p className="text-red-500 text-[11px] mt-0.5 font-medium">{errors.city.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input {...register("phone")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base" />
                    {errors.phone && <p className="text-red-500 text-[11px] mt-0.5 font-medium">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                    <input {...register("email")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base" />
                    {errors.email && <p className="text-red-500 text-[11px] mt-0.5 font-medium">{errors.email.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Message / Enquiry Details</label>
                  <textarea {...register("message")} rows={3} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium resize-none text-xs sm:text-base" />
                  {errors.message && <p className="text-red-500 text-[11px] mt-0.5 font-medium">{errors.message.message}</p>}
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-white py-3 sm:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors shadow-lg shadow-primary/20 disabled:opacity-70 mt-2 active:scale-95 cursor-pointer text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Partnership Request</span>
                      <Send size={15} />
                    </>
                  )}
                </button>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
