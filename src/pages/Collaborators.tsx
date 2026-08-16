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
    <div className="pt-32 md:pt-40 pb-20 font-body min-h-screen relative bg-slate-50">
      <SEO 
        title="Our Collaborators & Partners" 
        description="Discover the universities, colleges, and industry partners collaborating with FutureCodeAI to deliver top-tier education."
      />
      <Toaster position="top-center" />
      
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/5 via-indigo-500/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-text-heading mb-6 tracking-tight leading-tight">
              Trusted by Leading <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                Institutes & Colleges
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 font-medium">
              We partner with forward-thinking educational institutions to bring industry-leading tech curriculum directly to their campuses.
            </p>
          </motion.div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                activeCategory === category 
                  ? 'bg-text-heading text-white shadow-lg scale-105' 
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-gray-200'
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
            className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-24"
          >
            <AnimatePresence>
              {filteredData.map((collab) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={collab.id}
                  className="group"
                  style={{ perspective: 1000 }}
                >
                  <motion.div 
                    whileHover={{ rotateX: 2, rotateY: -2, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => setSelectedCollab(collab)}
                    className="bg-white rounded-[1.5rem] md:rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100 cursor-pointer h-full flex flex-col hover:shadow-xl transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
                      <img 
                        src={collab.logoUrl} 
                        alt={collab.name} 
                        className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl object-cover bg-slate-50 border border-gray-100 shadow-sm"
                      />
                      <span className="inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 bg-slate-50 text-slate-600 text-[10px] md:text-xs font-bold rounded-lg border border-gray-100">
                        {collab.type === 'College' ? <GraduationCap size={12} className="md:w-3.5 md:h-3.5" /> : <Building2 size={12} className="md:w-3.5 md:h-3.5" />}
                        {collab.type}
                      </span>
                    </div>

                    <h3 className="text-base md:text-xl font-extrabold text-text-heading mb-1 md:mb-2 line-clamp-2 md:line-clamp-1 leading-tight">{collab.name}</h3>
                    
                    <div className="flex items-center gap-1.5 md:gap-2 text-slate-500 text-xs md:text-sm font-medium mb-3 md:mb-4">
                      <MapPin size={14} className="text-primary md:w-4 md:h-4" />
                      {collab.city}
                    </div>
                    
                    <p className="text-slate-600 text-[11px] md:text-sm leading-relaxed mb-4 md:mb-6 flex-1 line-clamp-3">
                      {collab.description}
                    </p>

                    <div className="pt-3 md:pt-4 border-t border-gray-100 flex items-center justify-between mt-auto gap-2">
                      <div className="flex items-center gap-1.5 md:gap-2 text-indigo-600 font-bold text-[10px] md:text-sm bg-indigo-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg">
                        <BookOpen size={12} className="md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Active Courses</span>
                        <span className="sm:hidden">Courses</span>
                      </div>
                      
                      <Link 
                        to={`/programs?institute=${collab.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-primary hover:text-white transition-colors"
                      >
                        <ArrowRight size={14} className="md:w-[18px] md:h-[18px]" />
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filteredData.length === 0 && !loading && (
          <div className="text-center py-20">
            <Users size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold text-xl">No collaborators found</p>
          </div>
        )}

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto bg-text-heading rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-2xl shadow-indigo-900/20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-indigo-600/20 mix-blend-overlay" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-white mb-4">
              Become a Collaborator
            </h2>
            <p className="text-slate-300 text-lg md:text-xl font-medium mb-8 max-w-2xl mx-auto">
              Join our network of prestigious educational institutions and empower your students with cutting-edge tech education.
            </p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-white text-text-heading px-8 py-4 rounded-xl font-bold hover:bg-primary hover:text-white transition-all shadow-xl hover:shadow-primary/30 flex items-center gap-2 mx-auto"
            >
              Partner With Us
              <ArrowRight size={20} />
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center overflow-y-auto"
            style={{ zIndex: 1000 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative my-auto max-h-full flex flex-col"
            >
              <button 
                onClick={() => setSelectedCollab(null)}
                className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="overflow-y-auto p-6 md:p-10 flex-1">
                <div className="flex flex-col md:flex-row gap-8 items-start mb-10">
                  <img 
                    src={selectedCollab.logoUrl} 
                    alt={selectedCollab.name} 
                    className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover bg-slate-50 border border-gray-100 shadow-sm shrink-0"
                  />
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 text-sm font-bold rounded-lg border border-gray-100 mb-4">
                      {selectedCollab.type === 'College' ? <GraduationCap size={16} /> : <Building2 size={16} />}
                      {selectedCollab.type}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-text-heading mb-3">{selectedCollab.name}</h2>
                    <p className="text-lg text-slate-600 font-medium leading-relaxed">{selectedCollab.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Location</h4>
                      <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-gray-100">
                        <MapPin className="text-primary shrink-0 mt-0.5" size={20} />
                        <p className="text-slate-700 font-medium">{selectedCollab.address}</p>
                      </div>
                    </div>
                    {selectedCollab.contactPerson && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Contact</h4>
                        <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 space-y-3">
                          <p className="text-slate-700 font-bold">{selectedCollab.contactPerson}</p>
                          {selectedCollab.phone && (
                            <p className="flex items-center gap-2 text-slate-600 text-sm"><Phone size={16}/> {selectedCollab.phone}</p>
                          )}
                          {selectedCollab.email && (
                            <p className="flex items-center gap-2 text-slate-600 text-sm"><Mail size={16}/> {selectedCollab.email}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-48 md:h-full bg-slate-100 rounded-xl overflow-hidden border border-gray-200">
                    <iframe 
                      src={`https://www.google.com/maps?q=${encodeURIComponent(selectedCollab.address)}&output=embed`}
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen={false} 
                      loading="lazy"
                    ></iframe>
                  </div>
                </div>

                {selectedCollab.galleryUrls && selectedCollab.galleryUrls.length > 0 && (
                  <div>
                    <h4 className="text-xl font-extrabold text-text-heading mb-4 flex items-center gap-2">
                      Campus Photos
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {selectedCollab.galleryUrls.map((url, i) => (
                        <div key={i} className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-gray-100">
                          <img src={url} alt="Campus" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 md:p-8 border-t border-gray-100 bg-slate-50 flex items-center justify-between shrink-0">
                <span className="text-slate-500 font-medium text-sm">Want to study here?</span>
                <Link 
                  to={`/programs?institute=${selectedCollab.id}`}
                  className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  View Active Courses
                  <ArrowRight size={18} />
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto"
            style={{ zIndex: 1000 }}
            onClick={() => !isSubmitting && setIsFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto p-6 md:p-10"
            >
              <button 
                onClick={() => !isSubmitting && setIsFormOpen(false)}
                className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors z-10"
              >
                <X size={20} />
              </button>

              <AnimatePresence>
                {isSuccess && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center text-center p-8"
                  >
                    <CheckCircle2 size={80} className="text-emerald-500 mb-6" />
                    <h3 className="text-2xl font-extrabold text-text-heading mb-2">Request Submitted!</h3>
                    <p className="text-slate-600 font-medium">Thank you for your interest. Our partnership team will contact you shortly.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <h2 className="text-2xl md:text-3xl font-extrabold text-text-heading mb-2">Partner with Us</h2>
              <p className="text-slate-500 mb-8 font-medium">Fill out the details below and our team will get in touch.</p>

              <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Your Name</label>
                    <input {...register("name")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium" />
                    {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Institute / College Name</label>
                    <input {...register("instituteName")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium" />
                    {errors.instituteName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.instituteName.message}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Institution Type</label>
                    <select {...register("type")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium">
                      <option value="Coaching Institute">Coaching Institute</option>
                      <option value="College">College</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">City</label>
                    <input {...register("city")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium" />
                    {errors.city && <p className="text-red-500 text-xs mt-1 font-medium">{errors.city.message}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                    <input {...register("phone")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1 font-medium">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                    <input {...register("email")} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium" />
                    {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Message / Enquiry Details</label>
                  <textarea {...register("message")} rows={4} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium resize-none" />
                  {errors.message && <p className="text-red-500 text-xs mt-1 font-medium">{errors.message.message}</p>}
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors shadow-lg shadow-primary/20 disabled:opacity-70 mt-4"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Submit Partnership Request
                      <Send size={18} />
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
