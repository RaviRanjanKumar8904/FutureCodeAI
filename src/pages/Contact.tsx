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
        const q = query(faqsRef, orderBy('createdAt', 'asc')); // Assuming they have a createdAt field
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
      
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="pt-32 md:pt-40 pb-20 font-body min-h-screen relative overflow-hidden">
      <SEO 
        title="Contact Us" 
        description="Get in touch with FutureCodeAI. We are here to answer your questions and help you start your tech journey."
      />
      <Toaster position="top-center" />
      
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-20 -left-64 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute top-40 -right-64 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-text-heading mb-6 tracking-tight leading-tight">
              Let's Build Something <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                Great Together
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed">
              Have questions about our programs, internships, or institutional partnerships? Our team is here to help you accelerate your tech journey.
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start mb-24">
          
          {/* LEFT COLUMN: Contact Info & Map */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <a href="tel:+918709078136" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col items-start gap-4 cursor-pointer">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">Call Us</p>
                  <p className="text-lg font-extrabold text-text-heading">+91 8709078136</p>
                </div>
              </a>

              <a href="mailto:raviranjan8904@gmail.com" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col items-start gap-4 cursor-pointer">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">Email Us</p>
                  <p className="text-base font-extrabold text-text-heading break-all">raviranjan8904@gmail.com</p>
                </div>
              </a>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-5">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">Visit Us</p>
                <p className="text-base font-bold text-text-heading leading-relaxed">
                  Vikash Nagar, Polytechnic Chowk<br/>
                  Purnea, Bihar, India
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-5">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">Business Hours</p>
                <p className="text-base font-bold text-text-heading">Monday - Saturday</p>
                <p className="text-sm font-medium text-slate-500">10:00 AM - 6:00 PM</p>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://www.linkedin.com/in/raviranjankumar8904/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
            </div>

            {/* Google Map */}
            <div className="w-full h-64 md:h-80 bg-slate-100 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
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
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative"
          >
            {/* Subtle 3D Floating Mail Icon near form */}
            <motion.div
              animate={{ 
                y: [0, -15, 0],
                rotateZ: [-5, 5, -5],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-12 -right-8 md:-top-16 md:-right-12 text-primary opacity-20 pointer-events-none z-0"
              style={{ perspective: 1000 }}
            >
              <Mail size={120} strokeWidth={1} />
            </motion.div>

            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative z-10 overflow-hidden">
              
              <AnimatePresence>
                {isSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center text-center p-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15, delay: 0.2 }}
                    >
                      <CheckCircle2 size={80} className="text-emerald-500 mb-6" />
                    </motion.div>
                    <h3 className="text-2xl font-extrabold text-text-heading mb-2">Message Sent!</h3>
                    <p className="text-slate-600 font-medium">Thank you for reaching out. Our team will get back to you shortly.</p>
                    <button 
                      onClick={() => setIsSuccess(false)}
                      className="mt-8 px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <h2 className="text-2xl font-extrabold text-text-heading mb-6">Send us a Message</h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                    <input 
                      {...register("name")}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium"
                      placeholder="John Doe"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                    <input 
                      {...register("phone")}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium"
                      placeholder="+91 9876543210"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1 font-medium">{errors.phone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input 
                    {...register("email")}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium"
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                  <input 
                    {...register("subject")}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium"
                    placeholder="How can we help?"
                  />
                  {errors.subject && <p className="text-red-500 text-xs mt-1 font-medium">{errors.subject.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Your Message</label>
                  <textarea 
                    {...register("message")}
                    rows={4}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-heading font-medium resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                  {errors.message && <p className="text-red-500 text-xs mt-1 font-medium">{errors.message.message}</p>}
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors shadow-glow-primary disabled:opacity-70 group"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Message
                      <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>

        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto pt-12 border-t border-gray-100">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading font-extrabold text-text-heading mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600 font-medium">Find quick answers to common queries about FutureCodeAI.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div 
                key={faq.id} 
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <span className="font-extrabold text-lg text-text-heading pr-8">{faq.question}</span>
                  <ChevronDown 
                    size={20} 
                    className={`text-slate-400 transition-transform duration-300 shrink-0 ${openFaq === faq.id ? 'rotate-180 text-primary' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 text-slate-600 font-medium leading-relaxed border-t border-gray-50 pt-4">
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
