import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, getCountFromServer } from 'firebase/firestore';
import { BookOpen, Search, Plus, Trash2, Edit2, Users, Flame, Eye, EyeOff, Clock, Layers } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AddCourseModal from '../../components/admin/AddCourseModal';
import { logAdminActivity } from '../../utils/adminLogger';
import { useAuth } from '../../hooks/useAuth';

export default function ManageCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollmentsCount, setEnrollmentsCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);

  const fetchCoursesAndEnrollments = async () => {
    setLoading(true);
    try {
      const coursesSnap = await getDocs(query(collection(db, 'courses'), orderBy('title')));
      const courseList = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Efficiently fetch counts per course
      const countMap: Record<string, number> = {};
      await Promise.all(
        courseList.map(async (c: any) => {
          const title = c.title || c.courseName;
          if (title) {
            try {
              const countSnap = await getCountFromServer(
                query(collection(db, 'enrollments'), where('courseName', '==', title))
              );
              countMap[title] = countSnap.data().count;
            } catch {
              countMap[title] = 0;
            }
          }
        })
      );

      setCourses(courseList);
      setEnrollmentsCount(countMap);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesAndEnrollments();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean, title: string) => {
    try {
      await updateDoc(doc(db, 'courses', id), {
        isActive: !currentStatus
      });
      toast.success(`Course ${!currentStatus ? 'published' : 'moved to drafts'}`);
      await logAdminActivity(
        user?.email,
        'STATUS_CHANGE',
        `Course: ${title}`,
        `Changed active status to ${!currentStatus}`
      );
      fetchCoursesAndEnrollments();
    } catch (error) {
      console.error("Error updating course status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleToggleTopSelling = async (id: string, currentTop: boolean, title: string) => {
    try {
      await updateDoc(doc(db, 'courses', id), {
        isTopSelling: !currentTop
      });
      toast.success(`Top selling ${!currentTop ? 'enabled' : 'disabled'}`);
      await logAdminActivity(
        user?.email,
        'UPDATED',
        `Course: ${title}`,
        `Toggled top selling flag to ${!currentTop}`
      );
      fetchCoursesAndEnrollments();
    } catch (error) {
      console.error("Error updating top selling:", error);
      toast.error("Failed to update course");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the course "${title}"?`)) return;

    try {
      await deleteDoc(doc(db, 'courses', id));
      toast.success("Course deleted successfully");
      await logAdminActivity(
        user?.email,
        'DELETED',
        `Course: ${title}`
      );
      fetchCoursesAndEnrollments();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    }
  };

  const categories = ['All', ...Array.from(new Set(courses.map(c => c.category || 'General')))];

  const filteredData = courses.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'All' ? true : item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-center" />
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Course Management</h1>
            <p className="text-sm text-slate-500 font-medium">Create, price, structure, and publish courses across all partner centers.</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setEditingCourse(null);
            setIsModalOpen(true);
          }}
          className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-md shadow-purple-600/20 flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={18} />
          <span>Add New Course</span>
        </button>
      </div>

      {/* Main Content Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by course title or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-xs font-bold text-slate-400 pl-1">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent py-1 pr-2 outline-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500 px-2.5 py-1.5 bg-slate-200/60 rounded-lg">
              {filteredData.length} courses
            </div>
          </div>

        </div>

        {/* Course Cards Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">Loading course catalog...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-24 text-center">
            <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-bold text-slate-700">No courses found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search query or add a new course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredData.map((course) => {
              const enrolled = enrollmentsCount[course.title] || course.studentsCount || 0;
              return (
                <div 
                  key={course.id} 
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  {/* Thumbnail Image */}
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img
                      src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800'}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-white/90 text-slate-800 backdrop-blur-md shadow-sm">
                        {course.category || 'Tech Course'}
                      </span>
                      {course.isTopSelling && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1">
                          <Flame size={10} /> Top Selling
                        </span>
                      )}
                    </div>

                    {/* Active Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        course.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'
                      }`}>
                        {course.isActive ? 'Active' : 'Draft'}
                      </span>
                    </div>

                    {/* Price Tag on Thumbnail */}
                    {(course.originalPrice || course.discountedPrice) && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        {course.discountedPrice && (
                          <span className="text-lg font-extrabold text-white">
                            ₹{course.discountedPrice.toLocaleString()}
                          </span>
                        )}
                        {course.originalPrice && (
                          <span className="text-xs text-slate-300 line-through">
                            ₹{course.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Course Details */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1 mb-1">{course.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {course.description || 'Comprehensive training curriculum with live practical projects.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-purple-600" />
                        <span>{course.duration || '3 Months'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-600" />
                        <span className="truncate">{course.level || 'All Levels'}</span>
                      </div>
                    </div>

                    {/* Cross-Functional Links and Action Buttons */}
                    <div className="mt-auto space-y-3 pt-3 border-t border-slate-100">
                      
                      {/* Cross-Link: View Enrolled Students */}
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/admin/students?course=${encodeURIComponent(course.title)}`}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                          title="Filter student directory for this course"
                        >
                          <Users size={14} />
                          <span>{enrolled} Enrolled Students</span>
                        </Link>

                        <button
                          onClick={() => handleToggleTopSelling(course.id, course.isTopSelling, course.title)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${
                            course.isTopSelling ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-slate-500 hover:bg-slate-100'
                          }`}
                          title="Toggle Top Selling Flag"
                        >
                          🔥 {course.isTopSelling ? 'Featured' : 'Make Featured'}
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(course.id, course.isActive, course.title)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                            course.isActive 
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {course.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                          <span>{course.isActive ? 'Unpublish' : 'Publish'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingCourse(course);
                            setIsModalOpen(true);
                          }}
                          className="py-2 px-3.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDelete(course.id, course.title)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Delete Course"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      <AddCourseModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(null);
        }}
        onSuccess={() => {
          fetchCoursesAndEnrollments();
          if (editingCourse) {
            logAdminActivity(user?.email, 'UPDATED', `Course: ${editingCourse.title}`);
          } else {
            logAdminActivity(user?.email, 'CREATED', 'New Course');
          }
        }}
        initialData={editingCourse}
      />
    </div>
  );
}
