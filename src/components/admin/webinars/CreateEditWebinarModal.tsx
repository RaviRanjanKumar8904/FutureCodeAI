import React from 'react';
import { Video, X } from 'lucide-react';
import type { WebinarItem } from './types';

export interface CreateEditWebinarModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWebinar: WebinarItem | null;
  formData: {
    title: string;
    topic: string;
    speaker: string;
    startDate: string;
    totalDays: number;
    maxSeats: number;
    time: string;
    meetingLink: string;
    formLink: string;
    assignedStaff?: string;
    location?: string;
    status: 'Upcoming' | 'Live' | 'Completed';
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

export default function CreateEditWebinarModal({
  isOpen,
  onClose,
  editingWebinar,
  formData,
  setFormData,
  onSubmit,
  isSaving,
}: CreateEditWebinarModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 font-bold">
              <Video size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-slate-900">
                {editingWebinar ? 'Edit Multi-Day Webinar' : 'Create Multi-Day Webinar'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Configure duration (e.g. 15 days), timing &amp; meeting links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none space-y-3.5 text-xs sm:text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Webinar Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. 15-Day Masterclass on AI & Full-Stack Roadmap"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Total Days Duration <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.totalDays}
                  onChange={(e) => setFormData({ ...formData, totalDays: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-bold bg-white cursor-pointer"
                >
                  <option value="1">1 Day (Single Session)</option>
                  <option value="3">3 Days (Weekend Bootcamp)</option>
                  <option value="5">5 Days (Week Sprint)</option>
                  <option value="7">7 Days (1 Week)</option>
                  <option value="10">10 Days</option>
                  <option value="15">15 Days (Recommended)</option>
                  <option value="21">21 Days (3 Weeks)</option>
                  <option value="30">30 Days (1 Month)</option>
                  <option value="45">45 Days</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Capacity / Max Seats <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxSeats}
                  onChange={(e) => setFormData({ ...formData, maxSeats: Number(e.target.value) || 100 })}
                  placeholder="e.g. 100"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Topic / Subtitle Description</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g. Daily hands-on coding, System Design, & Capstone projects"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Host / Speaker Name</label>
                <input
                  type="text"
                  value={formData.speaker}
                  onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
                  placeholder="e.g. Er. Rahul & Technical Team"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-bold bg-white cursor-pointer"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Live">Live Now</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Daily Timing</label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  placeholder="e.g. 05:00 PM - 06:30 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Meeting Link (Google Meet / Zoom)</label>
                <input
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  placeholder="https://meet.google.com/xyz-abcd-efg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Staff / Instructor (Email or Name)</label>
                <input
                  type="text"
                  value={formData.assignedStaff || ''}
                  onChange={(e) => setFormData({ ...formData, assignedStaff: e.target.value })}
                  placeholder="e.g. instructor@futurecode.ai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campus Location / Room</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. AI Lab Room 204 or Online"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                />
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-gray-200 hover:bg-slate-100 transition-colors text-xs sm:text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs sm:text-sm hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : editingWebinar ? (
                'Update Webinar'
              ) : (
                'Create Webinar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
