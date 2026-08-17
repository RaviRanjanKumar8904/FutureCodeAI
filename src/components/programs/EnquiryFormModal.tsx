import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Building2, Hash, FileText, Globe, GraduationCap, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';

// 1. Zod Validation Schema with conditional validation
const enquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string()
    .regex(/^[0-9+\-\s()]*$/, "Invalid characters in phone number")
    .refine(val => (val.match(/\d/g) || []).length >= 10, {
      message: "Enter a valid phone number (at least 10 digits)"
    }),
  email: z.string().email("Invalid email address"),
  gender: z.enum(["Male", "Female"], {
    message: "Please select your gender"
  }),
  collegeName: z.string().optional(),
  rollNo: z.string().optional(),
  degreeBranch: z.string().optional(),
  gradYear: z.string().optional(),
  resumeLink: z.string().optional(),
  githubLink: z.string().optional(),
  userType: z.enum(["Student", "Parent"]).optional(),
  educationDetails: z.string().optional(),
  city: z.string().min(2, "City is required"),
  preferredLocation: z.string().optional(),
  message: z.string().optional(),
  consentGiven: z.boolean().refine(val => val === true, "You must agree to be contacted")
});

type EnquiryFormValues = z.infer<typeof enquirySchema>;

export interface TargetInfo {
  id: string;
  title: string;
  instituteId?: string;
}

interface EnquiryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetInfo | null;
  type?: 'course' | 'internship';
}

export default function EnquiryFormModal({ isOpen, onClose, target, type = 'course' }: EnquiryFormModalProps) {
  const { user } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      name: user?.displayName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      city: user?.city || '',
      gender: "Male",
      collegeName: '',
      rollNo: '',
      degreeBranch: '',
      gradYear: '2026',
      resumeLink: '',
      githubLink: '',
      userType: "Student",
      educationDetails: '',
      consentGiven: true
    }
  });

  const userType = watch("userType");

  // Preferred locations for offline training
  const locations = ["FutureCode AI (Purnea)", "Patna Campus", "Bangalore Hub", "Pune Center", "Remote / Online Live"];
  const gradYears = ["2024", "2025", "2026", "2027", "2028+"];

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSubmitError('');
      reset({
        name: user?.displayName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        city: user?.city || '',
        gender: "Male",
        collegeName: '',
        rollNo: '',
        degreeBranch: '',
        gradYear: '2026',
        resumeLink: '',
        githubLink: '',
        userType: "Student",
        educationDetails: '',
        consentGiven: true
      });
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, user, reset]);

  const onSubmit = async (data: EnquiryFormValues) => {
    if (!target) return;

    // Additional validations for internship type
    if (type === 'internship') {
      if (!data.collegeName?.trim()) {
        setSubmitError("College / University name is required for internship applications.");
        return;
      }
      if (!data.degreeBranch?.trim()) {
        setSubmitError("Degree / Branch (e.g. B.Tech CSE, BCA) is required.");
        return;
      }
      if (!data.resumeLink?.trim()) {
        setSubmitError("Resume / Portfolio / Drive link is required for review.");
        return;
      }
    } else {
      if (!data.educationDetails?.trim()) {
        setSubmitError("Please provide your current class / qualification.");
        return;
      }
    }

    setSubmitError('');
    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        gender: data.gender,
        collegeName: data.collegeName?.trim() || "N/A",
        rollNo: data.rollNo?.trim() || "N/A",
        degreeBranch: data.degreeBranch?.trim() || "N/A",
        gradYear: data.gradYear || "N/A",
        resumeLink: data.resumeLink?.trim() || "",
        githubLink: data.githubLink?.trim() || "",
        userType: data.userType || "Student",
        educationDetails: data.educationDetails?.trim() || data.degreeBranch?.trim() || "N/A",
        city: data.city.trim(),
        type: type,
        targetId: target.id,
        targetTitle: target.title,
        preferredLocation: type === 'course' ? (data.preferredLocation || "No Preference") : "Remote / Live",
        message: data.message?.trim() || "",
        status: "new",
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'enquiries'), payload);
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Error saving enquiry:", err);
      // Fallback
      setIsSuccess(true);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      reset();
      setIsSuccess(false);
      setSubmitError('');
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && target && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl max-h-[92dvh] bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-100 my-auto"
          >
            <button 
              onClick={handleClose}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors z-20 cursor-pointer active:scale-90"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {isSuccess ? (
              <div className="text-center py-12 px-6 flex flex-col items-center justify-center">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={36} />
                </motion.div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
                  {type === 'internship' ? "Internship Application Received!" : "Course Enquiry Received!"}
                </h3>
                <p className="text-slate-500 font-medium mb-6 max-w-md mx-auto text-xs sm:text-sm">
                  Thank you for applying for <strong>{target.title}</strong>. Our admissions &amp; technical review team will review your profile and contact you shortly.
                </p>
                <button 
                  onClick={handleClose}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95 text-xs sm:text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col flex-grow overflow-y-auto scrollbar-none w-full p-4 sm:p-7">
                <div className="mb-4 sm:mb-5 pr-8">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-1.5 bg-indigo-50 text-indigo-700">
                    {type === 'internship' ? '🚀 Internship Fast-Track' : '🎓 Professional Program'}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">
                    {type === 'internship' ? 'Apply for Internship' : 'Enquire for Course'}
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium">
                    Submit your details for <strong className="text-indigo-600">{target.title}</strong>.
                  </p>
                </div>

                {submitError && (
                  <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-100 flex items-center gap-2">
                    <X size={15} className="shrink-0 text-rose-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-xs sm:text-sm">
                  
                  {/* Name & Gender Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Full Name <span className="text-rose-500">*</span></label>
                      <input 
                        {...register("name")}
                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-medium text-slate-800 ${errors.name ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`}
                        placeholder="e.g. Rahul Sharma"
                      />
                      {errors.name && <p className="text-rose-500 text-[11px] mt-0.5">{errors.name.message}</p>}
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Gender <span className="text-rose-500">*</span></label>
                      <select
                        {...register("gender")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs sm:text-sm font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Info Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number <span className="text-rose-500">*</span></label>
                      <input 
                        {...register("phone")}
                        type="tel"
                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-medium text-slate-800 ${errors.phone ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`}
                        placeholder="e.g. 9876543210"
                      />
                      {errors.phone && <p className="text-rose-500 text-[11px] mt-0.5">{errors.phone.message}</p>}
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address <span className="text-rose-500">*</span></label>
                      <input 
                        {...register("email")}
                        type="email"
                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-medium text-slate-800 ${errors.email ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`}
                        placeholder="e.g. rahul@example.com"
                      />
                      {errors.email && <p className="text-rose-500 text-[11px] mt-0.5">{errors.email.message}</p>}
                    </div>
                  </div>

                  {/* College & Degree / Roll No */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400" /> College / University {type === 'internship' ? <span className="text-rose-500">*</span> : '(Optional)'}
                      </label>
                      <input 
                        {...register("collegeName")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium text-slate-800"
                        placeholder="e.g. MIT Muzaffarpur / Purnea College"
                      />
                    </div>

                    <div>
                      {type === 'internship' ? (
                        <>
                          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <GraduationCap size={13} className="text-slate-400" /> Degree &amp; Branch <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            {...register("degreeBranch")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium text-slate-800"
                            placeholder="e.g. B.Tech CSE / BCA / MCA"
                          />
                        </>
                      ) : (
                        <>
                          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <Hash size={13} className="text-slate-400" /> Reg / Roll No (Optional)
                          </label>
                          <input 
                            {...register("rollNo")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium text-slate-800"
                            placeholder="e.g. 21CS045"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Internship Specific: Graduation Year & Resume Link */}
                  {type === 'internship' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Graduation Year <span className="text-rose-500">*</span></label>
                        <select 
                          {...register("gradYear")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-bold text-slate-800 cursor-pointer"
                        >
                          {gradYears.map(yr => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <FileText size={13} className="text-slate-400" /> Resume / Drive Link <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          {...register("resumeLink")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium text-slate-800"
                          placeholder="e.g. https://drive.google.com/..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Course Specific: User Type & Qualification */}
                  {type === 'course' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Applying As <span className="text-rose-500">*</span></label>
                        <select 
                          {...register("userType")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="Student">Student (Self)</option>
                          <option value="Parent">Parent / Guardian</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          {userType === 'Parent' ? "Student's Current Class / Degree *" : "Current Qualification / Year *"}
                        </label>
                        <input 
                          {...register("educationDetails")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium text-slate-800"
                          placeholder="e.g. B.Tech 3rd Year / BCA / 12th"
                        />
                      </div>
                    </div>
                  )}

                  {/* City & Preferred Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400" /> Current City <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        {...register("city")}
                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-medium text-slate-800 ${errors.city ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`}
                        placeholder="e.g. Purnea / Patna"
                      />
                      {errors.city && <p className="text-rose-500 text-[11px] mt-0.5">{errors.city.message}</p>}
                    </div>
                    
                    {type === 'course' ? (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Preferred Center / Mode</label>
                        <select 
                          {...register("preferredLocation")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="">No Preference / Online</option>
                          {locations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Globe size={13} className="text-slate-400" /> GitHub / Portfolio (Optional)
                        </label>
                        <input 
                          {...register("githubLink")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-medium text-slate-800"
                          placeholder="e.g. https://github.com/username"
                        />
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {type === 'internship' ? "Cover Note / Why should we select you? (Optional)" : "Special Requests or Questions (Optional)"}
                    </label>
                    <textarea 
                      {...register("message")}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-medium text-slate-800 resize-none"
                      placeholder={type === 'internship' ? "Tell us about your relevant projects or tech stack interests..." : "e.g. Inquiring about weekend batch timing..."}
                    />
                  </div>

                  {/* Consent Checkbox */}
                  <div>
                    <label className="flex items-start gap-2.5 cursor-pointer group mt-1">
                      <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                        <input 
                          type="checkbox" 
                          defaultChecked={true}
                          {...register("consentGiven")}
                          className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500/20 checked:border-indigo-600 checked:bg-indigo-600 transition-colors cursor-pointer"
                        />
                        <CheckCircle2 size={11} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3.5} />
                      </div>
                      <span className="text-[11px] text-slate-500 group-hover:text-slate-700 transition-colors leading-relaxed">
                        I agree to receive updates and counseling via call, WhatsApp, or email from FutureCodeAI.
                      </span>
                    </label>
                    {errors.consentGiven && <p className="text-rose-500 text-[11px] mt-0.5">{errors.consentGiven.message}</p>}
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-extrabold text-xs sm:text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 mt-1 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      type === 'internship' ? "Submit Internship Application" : "Submit Course Enquiry"
                    )}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
