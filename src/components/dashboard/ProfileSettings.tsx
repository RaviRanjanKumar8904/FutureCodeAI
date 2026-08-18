import { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, CheckCircle2, Upload, RotateCcw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import UserAvatar from '../UserAvatar';

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
  const { compressImage } = useMediaUpload();
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const selectedAvatar = watch("photoURL") || user?.photoURL || AVATAR_OPTIONS[0];

  // Instant 1-Click Avatar Selection
  const handleSelectAvatar = async (avatarUrl: string) => {
    setValue('photoURL', avatarUrl, { shouldDirty: true });
    try {
      await updateProfile({ photoURL: avatarUrl });
      toast.success('Avatar updated!');
    } catch (err) {
      console.error('Error updating avatar:', err);
    }
  };

  // Custom Photo Upload Handler
  const handleCustomPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP)');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Optimizing & uploading photo...');

    try {
      const compressedDataUrl = await compressImage(file);
      setValue('photoURL', compressedDataUrl, { shouldDirty: true });
      await updateProfile({ photoURL: compressedDataUrl });
      toast.success('Profile picture updated successfully!', { id: toastId });
    } catch (err) {
      console.error('Error uploading custom photo:', err);
      toast.error('Failed to update picture. Please try another image.', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Reset to default avatar
  const handleResetPhoto = async () => {
    const defaultAvatar = AVATAR_OPTIONS[0];
    setValue('photoURL', defaultAvatar, { shouldDirty: true });
    try {
      await updateProfile({ photoURL: defaultAvatar });
      toast.success('Reset to default avatar');
    } catch (err) {
      console.error('Error resetting photo:', err);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfile({
        ...(data.displayName && data.displayName !== user?.displayName && { 
          displayName: data.displayName,
          nameChanged: true 
        }),
        ...(data.photoURL && { photoURL: data.photoURL }),
        phone: data.phone || '',
        school: data.school || '',
        city: data.city || '',
        degree: data.degree || '',
        yearOfStudy: data.yearOfStudy || '',
        githubUrl: data.githubUrl || '',
        linkedinUrl: data.linkedinUrl || '',
      });
      
      setIsSaved(true);
      toast.success('Profile saved successfully!');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save profile. Please check your connection.');
    }
  };

  if (!user) return null;

  const isCustomPhoto = selectedAvatar && !AVATAR_OPTIONS.includes(selectedAvatar);

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

        {/* Profile Picture / Avatar Management Card */}
        <div className="pb-8 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-slate-50/70 p-5 rounded-3xl border border-slate-100 mb-6">
            {/* Live Preview Avatar */}
            <div className="relative group">
              <UserAvatar 
                photoURL={selectedAvatar} 
                name={user.displayName}
                email={user.email}
                size="2xl"
                showStatus={true}
                className="border-4 border-white shadow-lg ring-2 ring-primary/20"
              />
            </div>

            {/* Photo Actions */}
            <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center justify-center sm:justify-start gap-2">
                  <span>Profile Photo</span>
                  {isCustomPhoto ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      Custom Photo
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      3D Avatar
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Choose a 3D avatar from below or upload your own custom picture (JPG, PNG, WebP).
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCustomPhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Upload size={14} />
                  <span>{isUploading ? 'Optimizing...' : 'Upload Custom Photo'}</span>
                </button>

                {isCustomPhoto && (
                  <button
                    type="button"
                    onClick={handleResetPhoto}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCcw size={13} />
                    <span>Reset to Avatar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3D Preset Avatars */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-500" />
                <span>Choose 3D Avatar (1-Click Apply)</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">8 Styles</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {AVATAR_OPTIONS.map((avatar, idx) => {
                const isSelected = selectedAvatar === avatar;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAvatar(avatar)}
                    title={`Select avatar style ${idx + 1}`}
                    className={`relative rounded-2xl p-1 transition-all duration-200 group cursor-pointer ${
                      isSelected 
                        ? 'ring-3 ring-primary ring-offset-2 scale-105 bg-indigo-50 shadow-md' 
                        : 'hover:scale-105 hover:bg-slate-100 bg-slate-50 border border-slate-200/80'
                    }`}
                  >
                    <img 
                      src={avatar} 
                      alt={`Avatar option ${idx + 1}`} 
                      className="w-full aspect-square rounded-xl object-cover bg-white shadow-xs" 
                    />
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center shadow-xs">
                        <CheckCircle2 size={13} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Profile Information Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6 relative z-10">
          
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
              className="bg-primary text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer active:scale-95"
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
