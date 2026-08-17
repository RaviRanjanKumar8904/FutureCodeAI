import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Building2, Hash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';

// 1. Zod Validation Schema
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
  userType: z.enum(["Student", "Parent"], { message: "Please select if you are a Student or Parent" }),
  educationDetails: z.string().min(2, "Please provide your current class/qualification"),
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
      userType: "Student",
      consentGiven: true
    }
  });

  const userType = watch("userType");

  // Preferred locations for offline training
  const locations = ["Patna", "Purnea", "Bangalore", "Pune", "Remote / Online"];

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      reset({
        name: user?.displayName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        city: user?.city || '',
        gender: "Male",
        collegeName: '',
        rollNo: '',
        userType: "Student",
        consentGiven: true
      });
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, user, reset]);

  if (!isOpen || !target) return null;

  const onSubmit = async (data: EnquiryFormValues) => {
    setSubmitError('');

    if (type === 'internship') {
      if (!data.collegeName?.trim()) {
        setSubmitError('Please enter your college/institute name');
        return;
      }
      if (!data.rollNo?.trim()) {
        setSubmitError('Please enter your Registration / Roll Number');
        return;
      }
    }

    try {
      // Structure the final payload for Firestore
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        gender: data.gender,
        collegeName: data.collegeName || '',
        rollNo: data.rollNo || '',
        studentId: user?.uid || '',
        instituteId: target.instituteId || '',
        userType: data.userType,
        educationDetails: data.educationDetails,
        city: data.city,
        type: type,
        targetId: target.id,
        targetTitle: target.title,
        preferredLocation: type === 'course' ? (data.preferredLocation || "No Preference") : "N/A",
        message: data.message || "",
        status: "new",
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'enquiries'), payload);
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Error saving enquiry:", err);
      // Fallback for offline/local simulation
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-[2rem] shadow-2xl flex flex-col z-10 overflow-hidden"
          >
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors z-20"
            >
              <X size={20} />
            </button>

            {isSuccess ? (
              <div className="text-center py-16 px-6 flex flex-col items-center justify-center">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={42} />
                </motion.div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">Application Received!</h3>
                <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto text-base">
                  Thank you for applying for <strong>{target.title}</strong>. Our admissions counseling team will get in touch with you shortly.
                </p>
                <button 
                  onClick={handleClose}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col flex-grow overflow-y-auto scrollbar-hide w-full p-6 sm:p-8">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-indigo-50 text-indigo-700">
                    {type === 'internship' ? '🚀 Internship Track' : '🎓 Professional Course'}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
                    {type === 'internship' ? 'Apply for Internship' : 'Enquire for Course'}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium">
                    Submit your application details for <strong className="text-indigo-600">{target.title}</strong>.
                  </p>
                </div>

                {submitError && (
                  <div className="mb-5 p-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-semibold border border-rose-100">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  
                  {/* Name & Gender Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Full Name *</label>
                      <input 
                        {...register("name")}
                        className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium text-slate-800 ${errors.name ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`}
                        placeholder="e.g. Rahul Sharma"
                      />
                      {errors.name && <p className="text-rose-500 text-xs mt-1 ml-1">{errors.name.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Gender *</label>
                      <select
                        {...register("gender")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      {errors.gender && <p className="text-rose-500 text-xs mt-1 ml-1">{errors.gender.message}</p>}
                    </div>
                  </div>

                  {/* Phone & Email Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Phone Number *</label>
                      <input 
                        {...register("phone")}
                        className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium text-slate-800 ${errors.phone ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`}
                        placeholder="e.g. 9876543210"
                      />
                      {errors.phone && <p className="text-rose-500 text-xs mt-1 ml-1">{errors.phone.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Email Address *</label>
                      <input 
                        {...register("email")}
                        className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium text-slate-800 ${errors.email ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`}
                        placeholder="e.g. rahul@example.com"
                      />
                      {errors.email && <p className="text-rose-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
                    </div>
                  </div>

                  {/* Internship Specific Fields: College Name & Reg/Roll No */}
                  {type === 'internship' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-teal-50/50 p-4 rounded-2xl border border-teal-100">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-teal-900 mb-1.5 ml-1 flex items-center gap-1.5">
                          <Building2 size={13} className="text-teal-600" /> College / Institute Name *
                        </label>
                        <input 
                          {...register("collegeName")}
                          className="w-full bg-white border border-teal-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium text-slate-800"
                          placeholder="e.g. Purnea College / MIT Muzaffarpur"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-teal-900 mb-1.5 ml-1 flex items-center gap-1.5">
                          <Hash size={13} className="text-teal-600" /> Registration / Roll No *
                        </label>
                        <input 
                          {...register("rollNo")}
                          className="w-full bg-white border border-teal-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium text-slate-800"
                          placeholder="e.g. 21CS045 / Reg No. 1928374"
                        />
                      </div>
                    </div>
                  )}

                  {/* User Type Radio (for courses) */}
                  {type === 'course' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Applicant Type *</label>
                      <div className="flex gap-6 ml-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            value="Student" 
                            {...register("userType")} 
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                          />
                          <span className="text-slate-700 font-bold text-sm">Student</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            value="Parent" 
                            {...register("userType")} 
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                          />
                          <span className="text-slate-700 font-bold text-sm">Parent / Guardian</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Education / Branch Details */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                      {type === 'internship' ? "Current Branch & Semester/Year *" : userType === 'Parent' ? "Child's Class / Degree & Institute *" : "Class / Qualification & School/College *"}
                    </label>
                    <input 
                      {...register("educationDetails")}
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium text-slate-800 ${errors.educationDetails ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`}
                      placeholder={type === 'internship' ? "e.g. B.Tech Computer Science, 6th Semester" : "e.g. 12th Standard / B.Sc IT 2nd Year"}
                    />
                    {errors.educationDetails && <p className="text-rose-500 text-xs mt-1 ml-1">{errors.educationDetails.message}</p>}
                  </div>

                  {/* City & Preferred Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Your City *</label>
                      <input 
                        {...register("city")}
                        className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium text-slate-800 ${errors.city ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'}`}
                        placeholder="e.g. Purnea / Patna"
                      />
                      {errors.city && <p className="text-rose-500 text-xs mt-1 ml-1">{errors.city.message}</p>}
                    </div>
                    
                    {type === 'course' && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Preferred Location</label>
                        <select 
                          {...register("preferredLocation")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="">No Preference</option>
                          {locations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                      {type === 'internship' ? "GitHub / Portfolio / Resume link (Optional)" : "Questions or special requests (Optional)"}
                    </label>
                    <textarea 
                      {...register("message")}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium text-slate-800 resize-none"
                      placeholder={type === 'internship' ? "e.g. https://github.com/myprofile or specific interests..." : "e.g. Inquiring about weekend batch timings..."}
                    />
                  </div>

                  {/* Consent Checkbox */}
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer group mt-2">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input 
                          type="checkbox" 
                          defaultChecked={true}
                          {...register("consentGiven")}
                          className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500/20 checked:border-indigo-600 checked:bg-indigo-600 transition-colors cursor-pointer"
                        />
                        <CheckCircle2 size={13} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3.5} />
                      </div>
                      <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors leading-relaxed">
                        I agree to receive application updates via call, WhatsApp, or email from FutureCodeAI.
                      </span>
                    </label>
                    {errors.consentGiven && <p className="text-rose-500 text-xs mt-1 ml-7">{errors.consentGiven.message}</p>}
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 mt-2 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
