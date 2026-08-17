import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import SmoothScroll from './components/SmoothScroll';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import GlobalLoader from './components/GlobalLoader';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Collaborators = lazy(() => import('./pages/Collaborators'));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'));
const Programs = lazy(() => import('./pages/Programs'));
const Internships = lazy(() => import('./pages/Internships'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageCollaborators = lazy(() => import('./pages/admin/ManageCollaborators'));
const ManageAdmins = lazy(() => import('./pages/admin/ManageAdmins'));
const ManageStaff = lazy(() => import('./pages/admin/ManageStaff'));
const ManageEnquiries = lazy(() => import('./pages/admin/ManageEnquiries'));
const ManageCourses = lazy(() => import('./pages/admin/ManageCourses'));
const ActivityLogs = lazy(() => import('./pages/admin/ActivityLogs'));
const ManageGallery = lazy(() => import('./pages/admin/ManageGallery'));
const ManageCertificates = lazy(() => import('./pages/admin/ManageCertificates'));
const ManageStudents = lazy(() => import('./pages/admin/ManageStudents'));
const ManageInternships = lazy(() => import('./pages/admin/ManageInternships'));
const NotFound = lazy(() => import('./pages/NotFound'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const InstituteDashboard = lazy(() => import('./pages/InstituteDashboard'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import WhatsAppButton from './components/WhatsAppButton';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorFallback from './components/ErrorFallback';

function App() {
  return (
    <HelmetProvider>
    <AuthProvider>
    <Router>
      <ScrollToTop />
      <SmoothScroll>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <ErrorBoundary fallback={<ErrorFallback />}>
          <Suspense fallback={<GlobalLoader fullScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/collaborators" element={<Collaborators />} />
            <Route path="/verify" element={<VerifyCertificate />} />
            <Route path="/programs/*" element={<Programs />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/internships" element={<Internships />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard/student/*" 
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard/institute/*" 
              element={
                <ProtectedRoute allowedRoles={['institute']}>
                  <InstituteDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/dashboard/staff/*" 
              element={
                <ProtectedRoute allowedRoles={['staff']}>
                  <StaffDashboard />
                </ProtectedRoute>
              } 
            />
            {/* Additional routes will be added here */}
            
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="collaborators" element={<ManageCollaborators />} />
              <Route path="admins" element={<ManageAdmins />} />
              <Route path="staff" element={<ManageStaff />} />
              <Route path="enquiries" element={<ManageEnquiries />} />
              <Route path="courses" element={<ManageCourses />} />
              {/* Admin Modules */}
              <Route path="internships" element={<ManageInternships />} />
              <Route path="students" element={<ManageStudents />} />
              <Route path="certificates" element={<ManageCertificates />} />
              <Route path="gallery" element={<ManageGallery />} />
              <Route path="logs" element={<ActivityLogs />} />
            </Route>
            
            {/* 404 Catch-All Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
          <WhatsAppButton />
          <Footer />
        </div>
      </SmoothScroll>
    </Router>
    </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
