import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import SEO from '../components/SEO';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string()
    .regex(/^[0-9+\-\s()]*$/, "Invalid characters in phone number")
    .refine(val => (val.match(/\d/g) || []).length >= 10, {
      message: "Please enter a valid phone number (at least 10 digits)"
    }),
  subject: z.string().min(5, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FAQ[] = [
  {
    id: '1',
    question: "What kind of courses do you offer?",
    answer: "We offer industry-relevant courses in Full Stack Web Development, Data Science, AI & Machine Learning, and Cloud Computing. All our programs are designed to be hands-on and practical."
  },
  {
    id: '2',
    question: "How can I apply for an internship?",
    answer: "You can apply for our internship programs directly through the 'Internships' page on our website. Selected candidates will get to work on live projects."
  },
  {
    id: '3',
    question: "Do you offer placement assistance?",
    answer: "Yes! We have dedicated placement support for all our certified students, helping them connect with our network of hiring partners across India."
  },
  {
    id: '4',
    question: "Can institutes partner with FutureCodeAI?",
    answer: "Absolutely. We collaborate with colleges and universities to bring our tech curriculum directly to their campuses. Contact us using the form above for partnership inquiries."
  }
];

export default function Contact() {
  const [faqs, setFaqs] = useState<FAQ[]>(DEFAULT_FAQS);
  const [openFaq, setOpenFaq] = useState<string | null>('1');
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema)
  });

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const faqsRef = collection(db, 'faqs');
        const q = query(faqsRef, orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const fetchedFaqs: FAQ[] = [];
          snapshot.forEach(doc => {
            fetchedFaqs.push({ id: doc.id, ...doc.data() } as FAQ);
          });
          setFaqs(fetchedFaqs);
        }
      } catch (error) {
        console.error("Error fetching FAQs:", error);
      }
    };
    
    fetchFaqs();
  }, []);

  const onSubmit = async (data: ContactFormValues) => {
    try {
      await addDoc(collection(db, 'contactMessages'), {
        ...data,
        status: 'new',
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
      reset();
      toast.success("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <div className="pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-20 font-body min-h-screen relative bg-slate-50 overflow-hidden">
      <SEO 
        title="Contact Us" 
        description="Get in touch with the FutureCodeAI team for admissions, course inquiries, corporate training, and partnerships."
      />
      <Toaster position="top-center" />
      
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-20 -left-64 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute top-40 -right-64 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              We're Here to Help
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-text-heading mb-3 sm:mb-4 tracking-tight leading-tight">
              Let's Build Something <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                Great Together
              </span>
            </h1>
            <p className="text-xs sm:text-lg text-slate-600 font-medium leading-relaxed max-w-xl mx-auto">
              Have questions about our programs, internships, or institutional partnerships? Our team is here to help.
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start mb-16 sm:mb-24">
          
          {/* LEFT COLUMN: Contact Info & Map */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="tel:+918709078136" className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col items-start gap-3 cursor-pointer active:scale-98">
                <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Call Us</p>
                  <p className="text-base font-extrabold text-text-heading">+91 8709078136</p>
                </div>
              </a>

              <a href="mailto:raviranjan8904@gmail.com" className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col items-start gap-3 cursor-pointer active:scale-98">
                <div className="w-11 h-11 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Email Us</p>
                  <p className="text-sm font-extrabold text-text-heading break-all">raviranjan8904@gmail.com</p>
                </div>
              </a>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="w-11 h-11 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Main Campus</p>
                <p className="text-sm font-bold text-text-heading leading-relaxed">
                  Vikash Nagar, Polytechnic Chowk<br/>
                  Purnea, Bihar, 854301
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="w-11 h-11 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Office Hours</p>
                <p className="text-sm font-bold text-text-heading">Monday - Saturday (10:00 AM - 6:00 PM)</p>
              </div>
            </div>

            {/* Google Map */}
            <div className="w-full h-56 sm:h-72 bg-slate-100 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14371.305282496836!2d87.4645!3d25.7766!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eff96f304192cd%3A0xc6cfb97c276ec966!2sPolytechnic%20Chowk%2C%20Purnia%2C%20Bihar!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="FutureCodeAI Location"
              ></iframe>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative"
          >
            <div className="bg-white rounded-3xl p-5 sm:p-8 md:p-10 shadow-sm border border-gray-100 relative z-10 overflow-hidden">
              
              <AnimatePresence>
                {isSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center text-center p-6"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15, delay: 0.1 }}
                    >
                      <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
                    </motion.div>
                    <h3 className="text-xl font-extrabold text-text-heading mb-1">Message Sent!</h3>
                    <p className="text-slate-600 font-medium text-xs sm:text-sm">Thank you for reaching out. Our team will get back to you shortly.</p>
                    <button 
                      onClick={() => setIsSuccess(false)}
                      className="mt-6 px-5 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <h2 className="text-xl sm:text-2xl font-extrabold text-text-heading mb-1">Send us a Message</h2>
              <p className="text-slate-500 mb-6 text-xs sm:text-sm font-medium">Fill out the details below and our team will get back to you.</p>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                    <input 
                      {...register("name")}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base"
                      placeholder="John Doe"
                    />
                    {errors.name && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input 
                      {...register("phone")}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base"
                      placeholder="+91 9876543210"
                    />
                    {errors.phone && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.phone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input 
                    {...register("email")}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base"
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <input 
                    {...register("subject")}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base"
                    placeholder="How can we help?"
                  />
                  {errors.subject && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.subject.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                  <textarea 
                    {...register("message")}
                    rows={4}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 font-medium text-xs sm:text-base resize-none"
                    placeholder="Tell us about your inquiry..."
                  />
                  {errors.message && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.message.message}</p>}
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors shadow-lg shadow-primary/20 disabled:opacity-70 active:scale-95 cursor-pointer text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* FAQs Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-heading mb-2">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-base text-slate-500 font-medium">Quick answers to common questions about FutureCodeAI</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <div 
                key={faq.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
              >
                <button 
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-base text-text-heading flex items-center justify-between gap-4 hover:text-primary transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown 
                    size={18} 
                    className={`transform transition-transform duration-300 shrink-0 text-slate-400 ${openFaq === faq.id ? 'rotate-180 text-primary' : ''}`}
                  />
                </button>
                
                <AnimatePresence>
                  {openFaq === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-slate-600 font-medium text-xs sm:text-sm border-t border-gray-50 pt-3 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
