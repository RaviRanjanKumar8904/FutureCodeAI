import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import SEO from '../components/SEO';

interface GalleryImage {
  id: string;
  imageUrl: string;
  title?: string;
  caption?: string;
  category: string;
  createdAt?: any;
  uploadedAt?: any;
}

const CATEGORIES = ["All", "Events", "Workshops", "Campus", "Hackathons", "Batches", "Other"];

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  
  // Lightbox state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'gallery'));
        
        if (snapshot.empty) {
          setImages([]);
        } else {
          const fetchedImages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as GalleryImage[];

          fetchedImages.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.uploadedAt?.toMillis ? a.uploadedAt.toMillis() : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.uploadedAt?.toMillis ? b.uploadedAt.toMillis() : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
            return timeB - timeA;
          });

          setImages(fetchedImages);
        }
      } catch (error) {
        console.error("Error fetching gallery images:", error);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const filteredImages = images.filter(img => 
    activeCategory === "All" ? true : img.category === activeCategory
  );

  const handleNext = useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % filteredImages.length);
    }
  }, [selectedIndex, filteredImages.length]);

  const handlePrev = useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + filteredImages.length) % filteredImages.length);
    }
  }, [selectedIndex, filteredImages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setSelectedIndex(null);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handleNext, handlePrev]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 min-h-screen flex items-center justify-center font-body bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <ImageIcon size={48} className="text-slate-300 mb-4" />
          <div className="h-4 w-32 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-20 font-body min-h-screen relative bg-slate-50 overflow-hidden">
      <SEO 
        title="Gallery & Campus Life" 
        description="Explore the FutureCodeAI gallery to see our campus, events, student projects, and hackathons."
      />
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              Life at FutureCodeAI
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-text-heading mb-3 sm:mb-4 tracking-tight leading-tight">
              Moments from Our <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                Classrooms &amp; Labs
              </span>
            </h1>
            <p className="text-xs sm:text-lg text-slate-600 font-medium max-w-xl mx-auto leading-relaxed">
              Explore snapshots of our offline cohorts, live coding hackathons, and tech seminars.
            </p>
          </motion.div>
        </div>

        {/* Filter Tabs (Touch scrollable) */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 mb-8 sm:mb-12 scrollbar-none">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setSelectedIndex(null);
              }}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 cursor-pointer active:scale-95 shrink-0 ${
                activeCategory === category 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Optimized Grid */}
        <motion.div 
          layout="position"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredImages.map((image, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={image.id}
                className="w-full"
              >
                <div 
                  className="group relative rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-slate-100 aspect-[4/3] shadow-sm hover:shadow-xl transition-all"
                  onClick={() => setSelectedIndex(index)}
                >
                  <div className="relative w-full h-full overflow-hidden">
                    <img 
                      src={image.imageUrl} 
                      alt={image.title || image.caption || 'FutureCodeAI Event'} 
                      loading="lazy"
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    
                    {/* Hover Overlay / Mobile info tag */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-4 sm:p-6 transition-opacity">
                      <span className="inline-block px-2.5 py-0.5 bg-primary/90 text-white text-[10px] sm:text-xs font-bold rounded-full mb-1.5 w-fit">
                        {image.category}
                      </span>
                      <h3 className="text-white font-bold text-sm sm:text-base line-clamp-1">
                        {image.title || image.caption || 'FutureCodeAI Moment'}
                      </h3>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredImages.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <p className="font-bold text-lg text-slate-700 mb-1">No moments found</p>
            <p className="text-xs text-slate-500">Check back soon for photos in this category.</p>
          </div>
        )}
      </div>

      {/* Touch-Friendly Lightbox Modal */}
      <AnimatePresence>
        {selectedIndex !== null && filteredImages[selectedIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIndex(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-3 sm:p-6"
          >
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 p-2.5 rounded-full transition-colors z-30 cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Prev Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-30 cursor-pointer"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-30 cursor-pointer"
            >
              <ChevronRight size={24} />
            </button>

            {/* Main Image Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center"
            >
              <img
                src={filteredImages[selectedIndex].imageUrl}
                alt={filteredImages[selectedIndex].title || 'Gallery Preview'}
                className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
              {(filteredImages[selectedIndex].title || filteredImages[selectedIndex].caption) && (
                <div className="mt-3 text-center text-white px-4">
                  <p className="font-bold text-sm sm:text-base">
                    {filteredImages[selectedIndex].title || filteredImages[selectedIndex].caption}
                  </p>
                  <span className="text-xs text-slate-400 font-mono mt-0.5 inline-block">
                    {selectedIndex + 1} / {filteredImages.length}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
