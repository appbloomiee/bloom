import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Plus, Edit2, Trash2, Save, Home, FileText, Image as ImageIcon, Megaphone } from 'lucide-react';

// Simple Router Implementation
const Router = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return React.Children.map(children, child => {
    if (child.props.path === currentPath) {
      return child;
    }
    return null;
  });
};

const Route = ({ children }) => children;

const Link = ({ to, children, className, onClick }) => {
  const handleClick = (e) => {
    e.preventDefault();
    window.location.hash = to;
    if (onClick) onClick();
  };
  return (
    <a href={`#${to}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};

// Storage utility
const storage = {
  get: (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }
};

const STORAGE_KEYS = {
  BLOGS: 'blogs',
  CATEGORIES: 'categories',
  BANNER: 'banner'
};

// Rich Text Editor Component - Fixed cursor issue
const RichTextEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const startOffset = range?.startOffset;
      const endOffset = range?.endOffset;
      const startContainer = range?.startContainer;

      editorRef.current.innerHTML = value;

      if (range && startContainer) {
        try {
          const newRange = document.createRange();
          newRange.setStart(startContainer, Math.min(startOffset, startContainer.length));
          newRange.setEnd(startContainer, Math.min(endOffset, startContainer.length));
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (e) {
          // If restoration fails, just place cursor at end
        }
      }
    }
  }, [value]);

  const buttons = [
    { cmd: 'bold', icon: 'B', style: { fontWeight: 'bold' } },
    { cmd: 'italic', icon: 'I', style: { fontStyle: 'italic' } },
    { cmd: 'underline', icon: 'U', style: { textDecoration: 'underline' } },
    { cmd: 'strikeThrough', icon: 'S', style: { textDecoration: 'line-through' } },
    { cmd: 'insertUnorderedList', icon: '•' },
    { cmd: 'insertOrderedList', icon: '1.' },
  ];

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-100 p-2 border-b flex flex-wrap gap-1">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => execCommand(btn.cmd)}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-200 text-sm"
            style={btn.style}
          >
            {btn.icon}
          </button>
        ))}
        <select
          onChange={(e) => execCommand('fontSize', e.target.value)}
          className="px-2 py-1 border rounded text-sm"
          defaultValue=""
        >
          <option value="">Size</option>
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="7">Huge</option>
        </select>
        <div className="flex gap-1">
          {colors.map((color, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => execCommand('foreColor', color)}
              className="w-6 h-6 border rounded"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="p-4 min-h-[300px] focus:outline-none"
        onInput={handleInput}
        suppressContentEditableWarning
      />
    </div>
  );
};

// Image Upload Component
const ImageUpload = ({ images, onChange }) => {
  const [previews, setPreviews] = useState(images || []);

  useEffect(() => {
    setPreviews(images || []);
  }, [images]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target.result);
        if (newPreviews.length === files.length) {
          const updated = [...previews, ...newPreviews];
          setPreviews(updated);
          onChange(updated);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => {
    const updated = previews.filter((_, i) => i !== idx);
    setPreviews(updated);
    onChange(updated);
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        {previews.map((img, idx) => (
          <div key={idx} className="relative group">
            <img src={img} alt="" className="w-full h-32 object-cover rounded border" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 w-fit">
        <Plus size={20} />
        <span>Upload Images</span>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>
    </div>
  );
};

// Blog List Page Component
const BlogListPage = ({ blogs, onEdit, onDelete }) => {
  return (
    <div className="space-y-4">
      <Link
        to="/write"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        <Plus size={20} />
        New Blog
      </Link>
      <div className="grid gap-4">
        {blogs.map(blog => (
          <div key={blog.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm text-gray-500">{blog.date}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {blog.category}
                  </span>
                  {blog.featured && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">{blog.title}</h3>
                <div 
                  className="text-gray-600 text-sm line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />
                <p className="text-xs text-gray-500 mt-2">By {blog.author}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(blog)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => onDelete(blog.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            {blog.images && blog.images.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {blog.images.slice(0, 3).map((img, idx) => (
                  <img key={idx} src={img} alt="" className="w-16 h-16 object-cover rounded" />
                ))}
                {blog.images.length > 3 && (
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-sm">
                    +{blog.images.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {blogs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No blogs yet. Click "New Blog" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

// Write Blog Page Component
const WriteBlogPage = ({ blogForm, setBlogForm, categories, onSubmit, onCancel, editingBlog, onAddCategory }) => {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim());
      setNewCategory('');
      setShowCategoryForm(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold mb-6">
        {editingBlog ? 'Edit Blog' : 'Write New Blog'}
      </h3>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            value={blogForm.title}
            onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter blog title"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            {!showCategoryForm ? (
              <div className="flex gap-2">
                <select
                  value={blogForm.category}
                  onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                  className="flex-1 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(true)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  title="Add new category"
                >
                  <Plus size={20} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="New category name"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setNewCategory('');
                  }}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Author *</label>
            <input
              type="text"
              value={blogForm.author}
              onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Author name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={blogForm.date}
              onChange={(e) => setBlogForm({ ...blogForm, date: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Time</label>
            <input
              type="time"
              value={blogForm.time}
              onChange={(e) => setBlogForm({ ...blogForm, time: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={blogForm.featured}
              onChange={(e) => setBlogForm({ ...blogForm, featured: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Featured Post</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Content</label>
          <RichTextEditor
            value={blogForm.content}
            onChange={(html) => setBlogForm({ ...blogForm, content: html })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Images</label>
          <ImageUpload
            images={blogForm.images}
            onChange={(imgs) => setBlogForm({ ...blogForm, images: imgs })}
          />
        </div>

        <div className="flex gap-4 flex-wrap">
          <button
            onClick={onSubmit}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Save size={20} />
            {editingBlog ? 'Update' : 'Publish'}
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Banner Page Component
const BannerPage = ({ banner, setBanner, onSave }) => {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold mb-6">Featured Banner Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Banner Header</label>
          <input
            type="text"
            value={banner.header}
            onChange={(e) => setBanner({ ...banner, header: e.target.value })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter banner header"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Banner Text</label>
          <textarea
            value={banner.text}
            onChange={(e) => setBanner({ ...banner, text: e.target.value })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows="4"
            placeholder="Enter banner text"
          />
        </div>
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Save size={20} />
          Save Banner
        </button>

        {(banner.header || banner.text) && (
          <div className="mt-6 p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
            <h4 className="text-2xl font-bold mb-2">{banner.header}</h4>
            <p>{banner.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Ads Page Component
const AdsPage = () => {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold mb-6">Featured Ads</h3>
      <p className="text-gray-600">Ads management will be implemented here.</p>
      <p className="text-sm text-gray-500 mt-2">This section is ready for future expansion.</p>
    </div>
  );
};

// Main App Component
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState(['Technology', 'Lifestyle', 'Business']);
  const [editingBlog, setEditingBlog] = useState(null);
  const [banner, setBanner] = useState({ text: '', header: '' });

  const [blogForm, setBlogForm] = useState({
    title: '',
    category: '',
    content: '',
    author: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    images: [],
    featured: false
  });

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load data
  useEffect(() => {
    const blogsData = storage.get(STORAGE_KEYS.BLOGS);
    const categoriesData = storage.get(STORAGE_KEYS.CATEGORIES);
    const bannerData = storage.get(STORAGE_KEYS.BANNER);

    if (blogsData) setBlogs(blogsData);
    if (categoriesData) setCategories(categoriesData);
    if (bannerData) setBanner(bannerData);
  }, []);

  const saveBlogs = (newBlogs) => {
    setBlogs(newBlogs);
    storage.set(STORAGE_KEYS.BLOGS, newBlogs);
  };

  const saveCategories = (newCategories) => {
    setCategories(newCategories);
    storage.set(STORAGE_KEYS.CATEGORIES, newCategories);
  };

  const handleBlogSubmit = () => {
    if (!blogForm.title || !blogForm.category || !blogForm.author) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingBlog) {
      const updated = blogs.map(b => b.id === editingBlog.id ? { ...blogForm, id: b.id } : b);
      saveBlogs(updated);
    } else {
      const newBlog = { ...blogForm, id: Date.now() };
      saveBlogs([...blogs, newBlog]);
    }
    resetForm();
    window.location.hash = '/';
  };

  const resetForm = () => {
    setBlogForm({
      title: '',
      category: '',
      content: '',
      author: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      images: [],
      featured: false
    });
    setEditingBlog(null);
  };

  const handleEdit = (blog) => {
    setBlogForm(blog);
    setEditingBlog(blog);
    window.location.hash = '/write';
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this blog?')) {
      saveBlogs(blogs.filter(b => b.id !== id));
    }
  };

  const addNewCategory = (newCat) => {
    if (newCat && !categories.includes(newCat)) {
      const updated = [...categories, newCat];
      saveCategories(updated);
      setBlogForm({ ...blogForm, category: newCat });
    }
  };

  const saveBanner = () => {
    storage.set(STORAGE_KEYS.BANNER, banner);
    alert('Banner saved successfully!');
  };

  const handleCancelWrite = () => {
    resetForm();
    window.location.hash = '/';
  };

  const menuItems = [
    { id: '/', label: 'Blog List', icon: Home },
    { id: '/write', label: 'Write Blog', icon: FileText },
    { id: '/banner', label: 'Featured Banner', icon: ImageIcon },
    { id: '/ads', label: 'Featured Ads', icon: Megaphone },
  ];

  const currentPath = window.location.hash.slice(1) || '/';

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 overflow-hidden fixed sm:relative h-full z-20`}>
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-8">Admin Panel</h1>
          <nav className="space-y-2">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.id}
                  onClick={() => {
                    if (window.innerWidth <= 768) setSidebarOpen(false);
                    if (item.id === '/write') {
                      resetForm();
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${
                    currentPath === item.id ? 'bg-blue-600' : 'hover:bg-gray-800'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && window.innerWidth <= 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 hover:bg-gray-100 rounded"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h2 className="text-lg sm:text-xl font-semibold">
            {menuItems.find(m => m.id === currentPath)?.label}
          </h2>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Router>
            <Route path="/">
              <BlogListPage 
                blogs={blogs}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Route>
            <Route path="/write">
              <WriteBlogPage
                blogForm={blogForm}
                setBlogForm={setBlogForm}
                categories={categories}
                onSubmit={handleBlogSubmit}
                onCancel={handleCancelWrite}
                editingBlog={editingBlog}
                onAddCategory={addNewCategory}
              />
            </Route>
            <Route path="/banner">
              <BannerPage
                banner={banner}
                setBanner={setBanner}
                onSave={saveBanner}
              />
            </Route>
            <Route path="/ads">
              <AdsPage />
            </Route>
          </Router>
        </main>
      </div>
    </div>
  );
}