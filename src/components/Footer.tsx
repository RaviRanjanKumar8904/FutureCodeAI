import { Link } from 'react-router-dom';
import { Globe, MessageCircle, Share2, Monitor, Mail, Phone, MapPin } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();

  if (
    location.pathname.startsWith('/dashboard/student') || 
    location.pathname.startsWith('/dashboard/institute') ||
    location.pathname.startsWith('/dashboard/staff') ||
    location.pathname.startsWith('/admin')
  ) {
    return null;
  }

  return (
    <footer className="bg-white pt-12 sm:pt-20 pb-8 sm:pb-10 border-t border-gray-100 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-16">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 space-y-4 md:space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.webp" alt="FutureCodeAI Logo" width={40} height={40} className="h-10 w-auto rounded-lg" />
              <span className="font-heading font-extrabold text-xl tracking-tight">
                <span className="text-[#152a4f]">FutureCode</span>
                <span className="text-[#24a4b5]">AI</span>
              </span>
            </Link>
            <p className="text-text-body text-xs sm:text-sm leading-relaxed">
              Empowering the next generation of tech leaders through immersive, project-based education in partnership with top offline institutes.
            </p>
            <div className="flex gap-2">
              <a href="#" aria-label="WhatsApp" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-text-body hover:text-primary hover:bg-slate-100 transition-colors"><MessageCircle size={18} /></a>
              <a href="#" aria-label="Website" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-text-body hover:text-primary hover:bg-slate-100 transition-colors"><Globe size={18} /></a>
              <a href="#" aria-label="Social Share" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-text-body hover:text-primary hover:bg-slate-100 transition-colors"><Share2 size={18} /></a>
              <a href="#" aria-label="Platform" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-text-body hover:text-primary hover:bg-slate-100 transition-colors"><Monitor size={18} /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h4 className="font-heading font-bold text-text-heading mb-4 sm:mb-6 text-sm sm:text-base">Programs</h4>
            <ul className="space-y-3 sm:space-y-4">
              <li><Link to="/programs/fullstack" className="text-xs sm:text-sm text-text-body hover:text-primary transition-colors py-1 inline-block">Full-Stack Development</Link></li>
              <li><Link to="/programs/ai-ml" className="text-sm text-text-body hover:text-primary transition-colors">AI & Machine Learning</Link></li>
              <li><Link to="/programs/dsa" className="text-sm text-text-body hover:text-primary transition-colors">Data Structures (C++/Java)</Link></li>
              <li><Link to="/programs/prompt-engineering" className="text-sm text-text-body hover:text-primary transition-colors">Prompt Engineering</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="col-span-1">
            <h4 className="font-heading font-bold text-text-heading mb-4 md:mb-6">Company</h4>
            <ul className="space-y-3 md:space-y-4">
              <li><Link to="/about" className="text-sm text-text-body hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/verify" className="text-sm font-semibold text-primary hover:text-indigo-500 transition-colors flex items-center gap-1">Verify Certificate</Link></li>
              <li><Link to="/contact" className="text-sm text-text-body hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 lg:col-span-1 mt-4 lg:mt-0">
            <h4 className="font-heading font-bold text-text-heading mb-4 md:mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-text-body">
                <MapPin size={18} className="text-primary mt-0.5 shrink-0" />
                <span>Vikash Nagar, Polytechnic Chowk, Purnea, 854301</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-text-body">
                <Phone size={18} className="text-primary shrink-0" />
                <span>+91 8709078136</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-text-body">
                <Mail size={18} className="text-primary shrink-0" />
                <span>raviranjan8904@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-body">
            © {new Date().getFullYear()} FutureCodeAI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-text-body hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm text-text-body hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
