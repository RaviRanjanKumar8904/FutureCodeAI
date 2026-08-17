import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import BackgroundBlobs from '../components/BackgroundBlobs';
import ProgramsHero from '../components/programs/ProgramsHero';
import FilterBar from '../components/programs/FilterBar';
import CourseCard from '../components/programs/CourseCard';
import type { CourseData } from '../components/programs/CourseCard';
import CourseModal from '../components/programs/CourseModal';
import EnquiryFormModal from '../components/programs/EnquiryFormModal';
import type { TargetInfo } from '../components/programs/EnquiryFormModal';
import CityCTA from '../components/programs/CityCTA';
import SEO from '../components/SEO';

export default function Programs() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const [enquiringTarget, setEnquiringTarget] = useState<TargetInfo | null>(null);
  const [selectedCourseModal, setSelectedCourseModal] = useState<CourseData | null>(null);

  const location = useLocation();

  useEffect(() => {
    // If we're linking to this page from a specific category on the homepage
    if (location.pathname === '/programs/fullstack') setCategoryFilter('Web Development');
    if (location.pathname === '/programs/ai-ml') setCategoryFilter('AI/ML');
    if (location.pathname === '/programs/dsa') setCategoryFilter('Programming Languages');
    if (location.pathname === '/programs/prompt-engineering') setCategoryFilter('Prompt Engineering');
  }, [location]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const q = query(collection(db, 'courses'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const fetchedCourses = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CourseData[];
        setCourses(fetchedCourses);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Derived state for filters
  const categories = useMemo(() => Array.from(new Set(courses.map(c => c.category))), [courses]);
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            course.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || course.category === categoryFilter;
      
      return matchesSearch && matchesCategory && course.isActive;
    }).sort((a, b) => {
      if (a.isTopSelling && !b.isTopSelling) return -1;
      if (!a.isTopSelling && b.isTopSelling) return 1;
      return 0;
    });
  }, [courses, searchQuery, categoryFilter]);

  const handleEnquire = (target: TargetInfo) => {
    setEnquiringTarget(target);
  };

  const handleViewDetails = (course: CourseData) => {
    setSelectedCourseModal(course);
  };

  return (
    <div className="w-full relative bg-background min-h-screen">
      <SEO 
        title="Programs & Courses" 
        description="Browse our comprehensive selection of tech courses, from Web Development and AI to Data Science and Blockchain."
      />
      <BackgroundBlobs />
      
      <main className="w-full relative z-10">
        <ProgramsHero />
        
        <FilterBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories}
        />

        <section className="py-20 relative z-10 min-h-[50vh]">
          <div className="container mx-auto px-6 max-w-7xl">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredCourses.map((course, index) => (
                  <CourseCard 
                    key={course.id} 
                    course={course} 
                    index={index} 
                    onEnquire={(target) => handleEnquire(target)}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <h3 className="text-2xl font-bold text-text-heading mb-2">No courses found</h3>
                <p className="text-slate-500">Try adjusting your filters or search query.</p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('All');
                  }}
                  className="mt-6 bg-white border border-gray-200 text-text-heading px-6 py-2 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </section>

        <CityCTA />
      </main>

      {/* Course Detail Modal (Syllabus & Curriculum) */}
      <CourseModal
        course={selectedCourseModal}
        onClose={() => setSelectedCourseModal(null)}
        onEnquire={(target) => {
          setSelectedCourseModal(null);
          handleEnquire(target);
        }}
      />

      {/* Course Enquiry Modal */}
      <EnquiryFormModal 
        isOpen={!!enquiringTarget}
        onClose={() => setEnquiringTarget(null)}
        target={enquiringTarget}
        type="course"
      />
    </div>
  );
}
