import SEO from '../components/SEO';
import BackgroundBlobs from '../components/BackgroundBlobs';
import { Shield, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="w-full relative bg-background min-h-screen pt-32 pb-24 font-body">
      <SEO 
        title="Privacy Policy" 
        description="Learn how FutureCodeAI protects and manages your personal data, course information, and privacy rights."
      />
      <BackgroundBlobs />

      <div className="container mx-auto px-6 max-w-4xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider mb-4">
            <Shield size={14} /> Trust & Transparency
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Last Updated: August 2026 • FutureCodeAI Education Platform
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm space-y-10 text-slate-700 leading-relaxed">
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="text-primary" size={20} /> 1. Information We Collect
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              FutureCodeAI collects information necessary to provide high-quality offline and online tech education, manage student enrollments, issue verifiable certificates, and coordinate with partner institutions.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-slate-600 pl-2">
              <li><strong className="text-slate-800">Personal Identification:</strong> Full name, email address, contact phone number, city, and educational background provided via enrollment and contact forms.</li>
              <li><strong className="text-slate-800">Account Credentials:</strong> Google OAuth identifier and login authentication tokens.</li>
              <li><strong className="text-slate-800">Academic & Certificate Records:</strong> Course completion status, batch details, assigned offline center, and issued credential IDs.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Lock className="text-primary" size={20} /> 2. How We Use Your Information
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Your data is strictly utilized for educational and platform administration purposes:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700 font-medium">Delivering curriculum, batches, and project mentorship.</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700 font-medium">Public verification of accredited certificates for employers.</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700 font-medium">Connecting students with internship hiring partners.</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700 font-medium">Responding to institutional and partnership inquiries.</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="text-primary" size={20} /> 3. Data Protection & Security
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              We implement enterprise-grade security practices powered by Google Cloud Firebase infrastructure. All communications are encrypted in transit via SSL/TLS 256-bit encryption. We never sell, rent, or trade your personal contact information to third-party marketing companies.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">4. Contact Our Data Protection Team</h2>
            <p className="text-sm sm:text-base text-slate-600">
              For any questions regarding your privacy, data deletion requests, or information corrections, please contact our administrative team:
            </p>
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm text-slate-800 font-medium space-y-1">
              <p><strong>Email:</strong> raviranjan8904@gmail.com</p>
              <p><strong>Phone:</strong> +91 8709078136</p>
              <p><strong>Address:</strong> Vikash Nagar, Polytechnic Chowk, Purnea, Bihar 854301</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
