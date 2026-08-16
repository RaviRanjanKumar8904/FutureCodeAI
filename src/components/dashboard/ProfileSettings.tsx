import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters").optional(),
  photoURL: z.string().optional(),
  phone: z.string()
    .regex(/^[0-9+\-\s()]*$/, "Invalid characters in phone number")
    .refine(val => !val || (val.match(/\d/g) || []).length >= 10, {
      message: "Enter a valid phone number (at least 10 digits)"
    })
    .optional()
    .or(z.literal('')),
  school: z.string().min(2, "School name is too short").optional().or(z.literal('')),
  city: z.string().min(2, "City name is too short").optional().or(z.literal('')),
  degree: z.string().optional().or(z.literal('')),
  yearOfStudy: z.string().optional().or(z.literal('')),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const AVATAR_OPTIONS = [
  '/avatars/avatar_laptop_1784367922366.png',
  '/avatars/avatar_thinking_1784367938707.png',
  '/avatars/avatar_ai_1784367950934.png',
  '/avatars/avatar_phone_1784367960795.png',
  '/avatars/avatar_smart_1784367972037.png',
  '/avatars/avatar_coding_1784367983250.png',
  '/avatars/avatar_vr_1784367994169.png',
  '/avatars/avatar_graduate_1784368005257.png'
];

export default function ProfileSettings() {
  const { user, updateProfile } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      photoURL: user?.photoURL || AVATAR_OPTIONS[0],
      phone: user?.phone || '',
      school: user?.school || '',
      city: user?.city || '',
      degree: user?.degree || '',
      yearOfStudy: user?.yearOfStudy || '',
      githubUrl: user?.githubUrl || '',
      linkedinUrl: user?.linkedinUrl || '',
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    updateProfile({
      ...(data.displayName && data.displayName !== user?.displayName && { 
        displayName: data.displayName,
        nameChanged: true 
      }),
      ...(data.photoURL && { photoURL: data.photoURL }),
      phone: data.phone,
      school: data.school,
      city: data.city,
      degree: data.degree,
      yearOfStudy: data.yearOfStudy,
      githubUrl: data.githubUrl,
      linkedinUrl: data.linkedinUrl,
    });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const selectedAvatar = watch("photoURL");

  if (!user) return null;

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-extrabold text-text-heading mb-6">Profile Settings</h2>
      
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        
        <AnimatePresence>
          {isSaved && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 right-4 left-4 md:left-auto bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg z-20"
            >
              <CheckCircle2 size={16} />
              Profile Updated Successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
          
          {/* Avatar Picker */}
          <div className="pb-6 border-b border-gray-100">
            <label className="block text-sm font-bold text-slate-700 mb-3">Choose Your Avatar</label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_OPTIONS.map((avatar, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setValue('photoURL', avatar, { shouldDirty: true })}
                  className={`relative rounded-full transition-all duration-200 ${
                    selectedAvatar === avatar 
                      ? 'ring-4 ring-primary ring-offset-2 scale-110' 
                      : 'hover:scale-105 hover:bg-slate-50 ring-1 ring-gray-200'
                  }`}
                >
                  <img src={avatar} alt={`Avatar option ${idx + 1}`} className="w-14 h-14 rounded-full bg-slate-100" />
                </button>
              ))}
            </div>
          </div>

          {/* Locked/Once-editable Fields */}
          <div className="grid md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  disabled={user.nameChanged}
                  {...register("displayName")}
                  className={`w-full border rounded-xl px-4 py-3 font-medium transition-all ${
                    user.nameChanged 
                      ? "bg-slate-50 border-gray-200 text-slate-500 cursor-not-allowed" 
                      : `bg-white text-text-heading outline-none focus:ring-2 focus:ring-primary/20 ${errors.displayName ? 'border-red-500' : 'border-gray-200 focus:border-primary'}`
                  }`}
                />
                {user.nameChanged && <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />}
              </div>
              {errors.displayName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.displayName.message}</p>}
              <p className={`text-xs mt-1 ${user.nameChanged ? 'text-slate-400' : 'text-amber-600 font-medium'}`}>
                {user.nameChanged 
                  ? "Name has already been updated." 
                  : "Note: Your name can only be changed once."}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <input 
                  type="text" 
                  disabled 
                  value={user.email}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-500 font-medium cursor-not-allowed"
                />
                <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 mt-1">Email is synced from your login provider.</p>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-6 pt-2">
            <h3 className="font-bold text-lg text-text-heading">Personal Details</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                <input 
                  {...register("phone")}
                  className={`w-full bg-white border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-heading ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-primary'}`}
                  placeholder="+91 8709078136"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">City</label>
                <input 
                  {...register("city")}
                  className={`w-full bg-white border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-heading ${errors.city ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-primary'}`}
                  placeholder="e.g. Patna"
                />
                {errors.city && <p className="text-red-500 text-xs mt-1 ml-1">{errors.city.message}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">School / College Name</label>
                <input 
                  {...register("school")}
                  className={`w-full bg-white border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-heading ${errors.school ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-primary'}`}
                  placeholder="e.g. NIT Patna"
                />
                {errors.school && <p className="text-red-500 text-xs mt-1 ml-1">{errors.school.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Degree / Branch</label>
                <input 
                  {...register("degree")}
                  className={`w-full bg-white border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-heading ${errors.degree ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-primary'}`}
                  placeholder="e.g. B.Tech Computer Science"
                />
                {errors.degree && <p className="text-red-500 text-xs mt-1 ml-1">{errors.degree.message}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Year of Study</label>
                <select 
                  {...register("yearOfStudy")}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading appearance-none"
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduated">Graduated</option>
                  <option value="Other">Other</option>
                </select>
                {errors.yearOfStudy && <p className="text-red-500 text-xs mt-1 ml-1">{errors.yearOfStudy.message}</p>}
              </div>
            </div>
          </div>

          {/* Professional Links */}
          <div className="space-y-6 pt-4 border-t border-gray-100">
            <h3 className="font-bold text-lg text-text-heading">Professional Profiles</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">LinkedIn URL</label>
                <input 
                  {...register("linkedinUrl")}
                  className={`w-full bg-white border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-heading ${errors.linkedinUrl ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-primary'}`}
                  placeholder="https://linkedin.com/in/..."
                />
                {errors.linkedinUrl && <p className="text-red-500 text-xs mt-1 ml-1">{errors.linkedinUrl.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">GitHub URL</label>
                <input 
                  {...register("githubUrl")}
                  className={`w-full bg-white border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-heading ${errors.githubUrl ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-primary'}`}
                  placeholder="https://github.com/..."
                />
                {errors.githubUrl && <p className="text-red-500 text-xs mt-1 ml-1">{errors.githubUrl.message}</p>}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting || (!isDirty && !isSaved)}
              className="bg-primary text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
