import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Image as ImageIcon, Upload, Trash2, X, Plus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { logAdminActivity } from '../../utils/adminLogger';

interface GalleryImage {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  storagePath: string;
  createdAt: any;
}

export default function ManageGallery() {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Events');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Events', 'Workshops', 'Campus', 'Hackathons', 'Other'];

  const fetchImages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data: GalleryImage[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
      setImages(data);
    } catch (error) {
      console.error("Error fetching gallery:", error);
      toast.error("Failed to load gallery images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size must be less than 5MB");
        return;
      }
      setUploadFile(file);
      // Auto-set title from filename if empty
      if (!uploadTitle) {
        setUploadTitle(file.name.split('.')[0].replace(/[-_]/g, ' '));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please select an image to upload");
      return;
    }
    if (!uploadTitle.trim()) {
      toast.error("Please provide a title");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Uploading image...");

    try {
      // 1. Upload to Storage
      const fileExtension = uploadFile.name.split('.').pop();
      const storagePath = `gallery/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, uploadFile);
      const downloadUrl = await getDownloadURL(storageRef);

      // 2. Save to Firestore
      await addDoc(collection(db, 'gallery'), {
        title: uploadTitle.trim(),
        category: uploadCategory,
        imageUrl: downloadUrl,
        storagePath: storagePath,
        createdAt: serverTimestamp()
      });

      toast.success("Image uploaded successfully!", { id: toastId });
      await logAdminActivity(
        user?.email,
        'CREATED',
        `Gallery Photo: ${uploadTitle.trim()}`,
        `Category: ${uploadCategory}`
      );
      
      // Reset form
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadCategory('Events');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh list
      fetchImages();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Check storage rules.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, storagePath: string, title?: string) => {
    if (!window.confirm("Are you sure you want to delete this image? This action cannot be undone.")) {
      return;
    }

    const toastId = toast.loading("Deleting image...");
    try {
      // 1. Delete from Storage
      if (storagePath) {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'gallery', id));

      toast.success("Image deleted successfully!", { id: toastId });
      await logAdminActivity(
        user?.email,
        'DELETED',
        `Gallery Photo: ${title || id}`
      );
      fetchImages();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete image.", { id: toastId });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <ImageIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Gallery CMS</h1>
            <p className="text-slate-500 font-medium">Manage images for the public gallery page.</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          Upload Image
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Upload New Image</h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Image File</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                  <Upload size={32} className="text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    {uploadFile ? uploadFile.name : 'Click to browse or drag and drop'}
                  </p>
                  <p className="text-xs text-slate-400">PNG, JPG up to 5MB</p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                <input 
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="E.g. Hackathon Winners 2026"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <select 
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Image'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading gallery...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <ImageIcon size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Images Uploaded</h3>
          <p className="text-slate-500 mb-6 max-w-md">Your gallery is currently empty. Upload images to showcase events, workshops, and student success stories.</p>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-purple-50 text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-purple-100 transition-colors"
          >
            <Plus size={20} />
            Upload First Image
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((image) => (
            <div key={image.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img 
                  src={image.imageUrl} 
                  alt={image.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                
                {/* Delete Button Overlay */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleDelete(image.id, image.storagePath)}
                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-lg text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                    title="Delete Image"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {/* Category Badge */}
                <div className="absolute bottom-3 left-3">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                    {image.category}
                  </span>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-slate-900 line-clamp-1 mb-1" title={image.title}>
                  {image.title}
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  {image.createdAt?.toDate ? image.createdAt.toDate().toLocaleDateString() : 'Just now'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
