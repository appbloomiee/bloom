import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Plus, Edit2, Trash2, Save, Home, FileText, Image as ImageIcon, Megaphone } from 'lucide-react';

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
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
};

// Storage utility (in-memory)
const memoryStorage = {
  data: {},
  get: (key) => {
    return memoryStorage.data[key] || null;
  },
  set: (key, value) => {
    memoryStorage.data[key] = value;
    return true;
  }
};

const STORAGE_KEYS = {
  BLOGS: 'blogs',
  CATEGORIES: 'categories',
  BANNER: 'banner'
};

// Rich Text Editor Component
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
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreviews(images || []);
  }, [images]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('http://107.167.94.243:5000/api/upload-image', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        
        if (result.success) {
          return {
            url: `http://107.167.94.243:5000${result.data.url}`,
            alt: result.data.originalName,
            caption: ''
          };
        }
        throw new Error(result.message || 'Upload failed');
      });

      const uploadedImages = await Promise.all(uploadPromises);
      const updated = [...previews, ...uploadedImages];
      setPreviews(updated);
      onChange(updated);
      alert('Images uploaded successfully!');
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (idx) => {
    const imageToRemove = previews[idx];
    
    // Try to delete from server
    try {
      const filename = imageToRemove.url.split('/').pop();
      await fetch(`http://107.167.94.243:5000/api/delete-image/${filename}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting image from server:', error);
    }

    const updated = previews.filter((_, i) => i !== idx);
    setPreviews(updated);
    onChange(updated);
  };

  const updateImageData = (idx, field, value) => {
    const updated = [...previews];
    updated[idx][field] = value;
    setPreviews(updated);
    onChange(updated);
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 mb-4">
        {previews.map((img, idx) => (
          <div key={idx} className="border rounded-lg p-3">
            <div className="flex gap-3 mb-2">
              <img src={img.url} alt="" className="w-24 h-24 object-cover rounded" />
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder="Alt text"
                  value={img.alt}
                  onChange={(e) => updateImageData(idx, 'alt', e.target.value)}
                  className="w-full px-3 py-1 border rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Caption"
                  value={img.caption}
                  onChange={(e) => updateImageData(idx, 'caption', e.target.value)}
                  className="w-full px-3 py-1 border rounded text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <label className={`flex items-center gap-2 px-4 py-2 rounded cursor-pointer w-fit ${
        uploading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
      } text-white`}>
        <Plus size={20} />
        <span>{uploading ? 'Uploading...' : 'Upload Images'}</span>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
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
          <div key={blog._id || blog.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {/* Left Image */}
              <div className="sm:w-64 h-48 sm:h-auto flex-shrink-0">
                {blog.images && blog.images.length > 0 ? (
                  <img 
                    src={blog.images[0].url} 
                    alt={blog.images[0].alt || blog.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon size={48} className="text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500">
                        {new Date(blog.publishedDate).toLocaleDateString()}
                      </span>
                      {blog.categories && blog.categories.map((cat, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {cat}
                        </span>
                      ))}
                      {blog.status === 'published' && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Published
                        </span>
                      )}
                      {blog.status === 'draft' && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Draft
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{blog.title}</h3>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                      {blog.excerpt || blog.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'}
                    </p>
                    <p className="text-xs text-gray-500">By {blog.author}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(blog)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(blog._id || blog.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
  const [submitting, setSubmitting] = useState(false);

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim());
      setNewCategory('');
      setShowCategoryForm(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit();
    setSubmitting(false);
  };

  const toggleCategory = (cat) => {
    const current = blogForm.categories || [];
    if (current.includes(cat)) {
      setBlogForm({ ...blogForm, categories: current.filter(c => c !== cat) });
    } else {
      setBlogForm({ ...blogForm, categories: [...current, cat] });
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

        <div>
          <label className="block text-sm font-medium mb-2">Categories * (Select multiple)</label>
          {!showCategoryForm ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded border ${
                      (blogForm.categories || []).includes(cat)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(true)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  title="Add new category"
                >
                  <Plus size={18} />
                </button>
              </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={blogForm.status}
              onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Published Date</label>
            <input
              type="date"
              value={blogForm.publishedDate}
              onChange={(e) => setBlogForm({ ...blogForm, publishedDate: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Published Time</label>
            <input
              type="time"
              value={blogForm.publishedTime}
              onChange={(e) => setBlogForm({ ...blogForm, publishedTime: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
          <input
            type="text"
            value={(blogForm.tags || []).join(', ')}
            onChange={(e) => setBlogForm({ 
              ...blogForm, 
              tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
            })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="react, javascript, tutorial"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Excerpt (Brief summary)</label>
          <textarea
            value={blogForm.excerpt}
            onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows="3"
            placeholder="A brief summary of your blog post..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Content *</label>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Meta Title (SEO)</label>
            <input
              type="text"
              value={blogForm.metaTitle}
              onChange={(e) => setBlogForm({ ...blogForm, metaTitle: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Max 70 characters"
              maxLength="70"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 mt-8">
              <input
                type="checkbox"
                checked={blogForm.allowComments}
                onChange={(e) => setBlogForm({ ...blogForm, allowComments: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Allow Comments</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Meta Description (SEO)</label>
          <textarea
            value={blogForm.metaDescription}
            onChange={(e) => setBlogForm({ ...blogForm, metaDescription: e.target.value })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows="2"
            placeholder="Max 160 characters"
            maxLength="160"
          />
        </div>

        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            <Save size={20} />
            {submitting ? 'Saving...' : (editingBlog ? 'Update' : 'Publish')}
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
  const [categories, setCategories] = useState(['Plant', 'Pet', 'Food', 'Medicine']);
  const [editingBlog, setEditingBlog] = useState(null);
  const [banner, setBanner] = useState({ text: '', header: '' });

  const [blogForm, setBlogForm] = useState({
    title: '',
    categories: [],
    content: '',
    excerpt: '',
    author: '',
    publishedDate: new Date().toISOString().split('T')[0],
    publishedTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    images: [],
    status: 'draft',
    tags: [],
    metaTitle: '',
    metaDescription: '',
    allowComments: true
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

  // API Base URL
  const API_URL = 'http://107.167.94.243:5000/api';

  // Load data from API
  useEffect(() => {
    fetchBlogs();
    fetchCategories();
    fetchBanner();
  }, []);

  const fetchBlogs = async () => {
    try {
      const response = await fetch(`${API_URL}/blogs`);
      const data = await response.json();
      if (data.success) {
        setBlogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      // Fallback to local storage
      const blogsData = memoryStorage.get(STORAGE_KEYS.BLOGS);
      if (blogsData) setBlogs(blogsData);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`);
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setCategories(data.data.map(cat => cat.name));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Keep default categories
    }
  };

  const fetchBanner = async () => {
    try {
      const response = await fetch(`${API_URL}/banners/active`);
      const data = await response.json();
      if (data.success && data.data) {
        setBanner(data.data);
      }
    } catch (error) {
      console.error('Error fetching banner:', error);
    }
  };

  const saveBlogs = (newBlogs) => {
    setBlogs(newBlogs);
    memoryStorage.set(STORAGE_KEYS.BLOGS, newBlogs);
  };

  const saveCategories = (newCategories) => {
    setCategories(newCategories);
    memoryStorage.set(STORAGE_KEYS.CATEGORIES, newCategories);
  };

  const handleBlogSubmit = async () => {
    if (!blogForm.title || !blogForm.categories.length || !blogForm.author || !blogForm.content) {
      alert('Please fill in all required fields: Title, Categories, Author, and Content');
      return;
    }

    // Prepare blog data according to schema
    const blogData = {
      title: blogForm.title,
      content: blogForm.content,
      excerpt: blogForm.excerpt || blogForm.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
      author: blogForm.author,
      categories: blogForm.categories,
      tags: blogForm.tags || [],
      images: blogForm.images || [],
      status: blogForm.status || 'draft',
      publishedDate: blogForm.publishedDate,
      publishedTime: blogForm.publishedTime,
      metaTitle: blogForm.metaTitle || blogForm.title,
      metaDescription: blogForm.metaDescription || blogForm.content.replace(/<[^>]*>/g, '').substring(0, 160),
      allowComments: blogForm.allowComments
    };

    try {
      const url = editingBlog ? `${API_URL}/blogs/${editingBlog._id}` : `${API_URL}/blogs`;
      const method = editingBlog ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blogData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to save blog');
      }

      alert('Blog saved successfully!');
      await fetchBlogs(); // Refresh blog list
      resetForm();
      window.location.hash = '/';
    } catch (error) {
      console.error('Error saving blog:', error);
      alert('Failed to save blog: ' + error.message);
      
      // Fallback: save locally
      if (editingBlog) {
        const updated = blogs.map(b => b._id === editingBlog._id ? { ...blogData, _id: b._id } : b);
        saveBlogs(updated);
      } else {
        const newBlog = { ...blogData, _id: Date.now().toString() };
        saveBlogs([...blogs, newBlog]);
      }
      
      alert('Blog saved locally (API unavailable)');
      resetForm();
      window.location.hash = '/';
    }
  };

  const resetForm = () => {
    setBlogForm({
      title: '',
      categories: [],
      content: '',
      excerpt: '',
      author: '',
      publishedDate: new Date().toISOString().split('T')[0],
      publishedTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
      images: [],
      status: 'draft',
      tags: [],
      metaTitle: '',
      metaDescription: '',
      allowComments: true
    });
    setEditingBlog(null);
  };

  const handleEdit = (blog) => {
    setBlogForm(blog);
    setEditingBlog(blog);
    window.location.hash = '/write';
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this blog?')) {
      try {
        const response = await fetch(`${API_URL}/blogs/${id}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to delete blog');
        }
        
        alert('Blog deleted successfully!');
        await fetchBlogs(); // Refresh blog list
      } catch (error) {
        console.error('Error deleting blog:', error);
        alert('Failed to delete blog: ' + error.message);
        // Fallback: delete locally
        saveBlogs(blogs.filter(b => b._id !== id));
      }
    }
  };

  const addNewCategory = async (newCat) => {
    if (newCat && !categories.includes(newCat)) {
      try {
        const response = await fetch(`${API_URL}/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newCat,
            description: '',
            active: true
          })
        });

        const result = await response.json();
        
        if (result.success) {
          const updated = [...categories, newCat];
          setCategories(updated);
          saveCategories(updated);
          setBlogForm({ ...blogForm, categories: [...(blogForm.categories || []), newCat] });
        }
      } catch (error) {
        console.error('Error adding category:', error);
        // Fallback: add locally
        const updated = [...categories, newCat];
        setCategories(updated);
        saveCategories(updated);
        setBlogForm({ ...blogForm, categories: [...(blogForm.categories || []), newCat] });
      }
    }
  };

  const saveBanner = async () => {
    try {
      // Check if banner exists
      const existingResponse = await fetch(`${API_URL}/banners/active`);
      const existingData = await existingResponse.json();
      
      let response;
      if (existingData.success && existingData.data) {
        // Update existing banner
        response = await fetch(`${API_URL}/banners/${existingData.data._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(banner)
        });
      } else {
        // Create new banner
        response = await fetch(`${API_URL}/banners`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...banner, active: true })
        });
      }

      const result = await response.json();
      
      if (result.success) {
        alert('Banner saved successfully!');
      } else {
        throw new Error(result.message || 'Failed to save banner');
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      // Fallback: save locally
      memoryStorage.set(STORAGE_KEYS.BANNER, banner);
      alert('Banner saved locally (API unavailable)');
    }
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded transition text-left ${
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