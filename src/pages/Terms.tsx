import SEO from '../components/SEO';
import BackgroundBlobs from '../components/BackgroundBlobs';
import { BookOpen, ShieldCheck, Scale, AlertTriangle } from 'lucide-react';

export default function Terms() {
  return (
    <div className="w-full relative bg-background min-h-screen pt-32 pb-24 font-body">
      <SEO 
        title="Terms of Service" 
        description="Read the terms and conditions for enrolling in FutureCodeAI programs, using educational resources, and certificate verification."
      />
      <BackgroundBlobs />

      <div className="container mx-auto px-6 max-w-4xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider mb-4">
            <Scale size={14} /> Legal & Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Last Updated: August 2026 • FutureCodeAI
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm space-y-10 text-slate-700 leading-relaxed">
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="text-primary" size={20} /> 1. Acceptance of Terms
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              By accessing FutureCodeAI's website, mobile portal, enrolling in courses, participating in internship programs, or using certificate verification services, you agree to comply with and be bound by these Terms of Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} /> 2. Course Enrollment & Certificate Policy
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-slate-600 pl-2">
              <li><strong className="text-slate-800">Enrollment:</strong> Registration in our offline training batches or online tracks is subject to seat availability and administrative confirmation.</li>
              <li><strong className="text-slate-800">Certificate Issuance:</strong> Verifiable certificates are issued exclusively to students who fulfill course attendance criteria, practical project submissions, and evaluation milestones.</li>
              <li><strong className="text-slate-800">Verification Rights:</strong> FutureCodeAI reserves the right to revoke certificates in cases of academic dishonesty, plagiarism, or impersonation.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="text-primary" size={20} /> 3. Code of Conduct
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Students, partner institutes, and instructors are expected to maintain professional integrity across physical classrooms and digital discussion channels. Harassment, disruption of batch sessions, or unauthorized redistribution of proprietary curriculum materials will result in immediate termination of account access without refund.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">4. Intellectual Property</h2>
            <p className="text-sm sm:text-base text-slate-600">
              All curriculum designs, lecture slide decks, coding challenge suites, software assets, brand logos, and website code are the exclusive intellectual property of FutureCodeAI. Students retain full intellectual property ownership of the individual capstone projects and portfolio code they build.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">5. Governing Law & Inquiries</h2>
            <p className="text-sm sm:text-base text-slate-600">
              These terms are governed by and construed in accordance with the laws of India. For questions or legal notices, contact our headquarters at <strong className="text-slate-800">Vikash Nagar, Polytechnic Chowk, Purnea, Bihar 854301</strong> or email <strong className="text-slate-800">raviranjan8904@gmail.com</strong>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
