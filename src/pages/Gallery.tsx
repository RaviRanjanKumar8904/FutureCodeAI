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
        setImages([]); // Fallback on error
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
    <div className="pt-32 md:pt-40 pb-20 font-body min-h-screen relative bg-slate-50">
      <SEO 
        title="Gallery" 
        description="Explore the FutureCodeAI gallery to see our campus, events, student projects, and hackathons."
      />
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-text-heading mb-6 tracking-tight">
              Moments from Our <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                Classrooms
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 font-medium">
              Explore snapshots of our offline batches, interactive workshops, and tech events.
            </p>
          </motion.div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setSelectedIndex(null); // Reset lightbox if open
              }}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                activeCategory === category 
                  ? 'bg-text-heading text-white shadow-lg scale-105' 
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Optimized Grid */}
        <motion.div 
          layout="position"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredImages.map((image, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                key={image.id}
                className="w-full"
              >
                <div 
                  className="group relative rounded-2xl overflow-hidden cursor-pointer bg-slate-100 aspect-[4/3]"
                  onClick={() => setSelectedIndex(index)}
                >
                  <div className="relative w-full h-full overflow-hidden">
                    <img 
                      src={image.imageUrl} 
                      alt={image.title || image.caption || 'FutureCodeAI Event'} 
                      loading="lazy"
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <span className="inline-block px-3 py-1 bg-primary/90 text-white text-xs font-bold rounded-full mb-2 w-fit">
                        {image.category}
                      </span>
                      <h3 className="text-white font-extrabold text-lg line-clamp-2">
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
          <div className="text-center py-20 text-slate-500">
            <p className="font-bold text-xl mb-2">No moments found</p>
            <p>Check back later for photos in this category.</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Close Button */}
            <button 
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-50"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(null);
              }}
            >
              <X size={24} />
            </button>

            {/* Navigation Arrows */}
            {filteredImages.length > 1 && (
              <>
                <button 
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                >
                  <ChevronLeft size={32} />
                </button>
                <button 
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                >
                  <ChevronRight size={32} />
                </button>
              </>
            )}

            {/* Main Image Container */}
            <div 
              className="relative max-w-5xl w-full max-h-[80vh] px-4 md:px-20 flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedIndex}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.05, y: -20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative w-full flex flex-col items-center"
                >
                  <img 
                    src={filteredImages[selectedIndex].imageUrl} 
                    alt={filteredImages[selectedIndex].title || filteredImages[selectedIndex].caption || 'FutureCodeAI Event'}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                  />
                  
                  {/* Caption & Metadata */}
                  <div className="mt-6 text-center">
                    <span className="inline-block px-3 py-1 bg-white/10 text-slate-300 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
                      {filteredImages[selectedIndex].category}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                      {filteredImages[selectedIndex].title || filteredImages[selectedIndex].caption || 'FutureCodeAI Moment'}
                    </h2>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
