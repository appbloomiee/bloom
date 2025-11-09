// ============================================
// COMPLETE EXPRESS BLOG API
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const slugify = require('slugify');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// ============================================
// CREATE UPLOADS DIRECTORY IF NOT EXISTS
// ============================================
const uploadsDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ============================================
// MULTER CONFIGURATION FOR IMAGE UPLOAD
// ============================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public/images directory
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// ============================================
// DATABASE CONNECTION
// ============================================
const MONGODB_URI = 'mongodb+srv://bloomie:Bloomie%40123@cluster0.wvxlq3z.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============================================
// BLOG SCHEMA & MODEL
// ============================================
const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: true
    },
    
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true
    },
    
    content: {
      type: String,
      required: [true, 'Blog content is required'],
      minlength: [50, 'Content must be at least 50 characters long']
    },
    
    excerpt: {
      type: String,
      maxlength: [500, 'Excerpt cannot exceed 500 characters']
    },
    
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      minlength: [2, 'Author name must be at least 2 characters'],
      maxlength: [100, 'Author name cannot exceed 100 characters'],
      index: true
    },
    
    categories: [{
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      // enum: {
      //   values: ['Plant', 'Pet', 'Food', 'Medicine'],
      //   message: '{VALUE} is not a valid category'
      // },
      index: true
    }],
    
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [30, 'Tag cannot exceed 30 characters']
    }],
    
    images: [{
      url: {
        type: String,
        required: [true, 'Image URL is required']
      },
      alt: {
        type: String,
        default: '',
        maxlength: [200, 'Alt text cannot exceed 200 characters']
      },
      caption: {
        type: String,
        default: '',
        maxlength: [300, 'Caption cannot exceed 300 characters']
      }
    }],
    
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: '{VALUE} is not a valid status'
      },
      default: 'draft',
      index: true
    },
    
    publishedDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    
    publishedTime: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:MM format'
      }
    },
    
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative']
    },
    
    likes: {
      type: Number,
      default: 0,
      min: [0, 'Likes cannot be negative']
    },
    
    readTime: {
      type: Number,
      default: 0
    },
    
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [70, 'Meta title should not exceed 70 characters for SEO']
    },
    
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description should not exceed 160 characters for SEO']
    },
    
    keywords: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    
    allowComments: {
      type: Boolean,
      default: true
    },
    
    commentsCount: {
      type: Number,
      default: 0,
      min: [0, 'Comments count cannot be negative']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
blogSchema.index({ title: 'text', content: 'text' });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ views: -1 });
blogSchema.index({ status: 1, publishedDate: -1 });

// Virtual for URL-friendly slug
blogSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`;
});

// Virtual for formatted date
blogSchema.virtual('formattedDate').get(function() {
  return this.publishedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Pre-save middleware to generate slug
blogSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    let baseSlug = slugify(this.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
    this.slug = baseSlug;
  }
  next();
});

// Pre-save middleware to generate excerpt if not provided
blogSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.excerpt) {
    const plainText = this.content.replace(/<[^>]*>/g, '');
    this.excerpt = plainText.substring(0, 200) + '...';
  }
  next();
});

// Pre-save middleware to calculate read time
blogSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const wordsPerMinute = 200;
    const plainText = this.content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / wordsPerMinute);
  }
  next();
});

// Pre-save middleware to auto-generate meta fields
blogSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.metaTitle) {
    this.metaTitle = this.title.substring(0, 70);
  }
  
  if (this.isModified('content') && !this.metaDescription) {
    const plainText = this.content.replace(/<[^>]*>/g, '');
    this.metaDescription = plainText.substring(0, 160);
  }
  
  next();
});

const Blog = mongoose.model('Blog', blogSchema);

// ============================================
// CATEGORY SCHEMA & MODEL
// ============================================
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    color: {
      type: String,
      default: '#3B82F6',
      validate: {
        validator: function(v) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Invalid color format. Use hex color code (e.g., #FF5733)'
      }
    },
    
    blogCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true
    });
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

// ============================================
// BANNER SCHEMA & MODEL
// ============================================
const bannerSchema = new mongoose.Schema(
  {
    header: {
      type: String,
      required: [true, 'Banner header is required'],
      trim: true,
      maxlength: [100, 'Header cannot exceed 100 characters']
    },
    
    text: {
      type: String,
      required: [true, 'Banner text is required'],
      trim: true,
      maxlength: [500, 'Text cannot exceed 500 characters']
    },
    
    buttonText: {
      type: String,
      trim: true,
      maxlength: [50, 'Button text cannot exceed 50 characters']
    },
    
    buttonLink: {
      type: String,
      trim: true
    },
    
    backgroundImage: {
      type: String,
      trim: true
    },
    
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Banner = mongoose.model('Banner', bannerSchema);

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

// ========== BLOG CONTROLLERS ==========

// Upload single image
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imageUrl = `/images/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message
    });
  }
};

// Upload multiple images
const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const imageData = req.files.map(file => ({
      url: `/images/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: imageData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading images',
      error: error.message
    });
  }
};

// Delete image file
const deleteImage = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
};

// Get all blogs with filtering, sorting, and pagination
const getAllBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      author,
      search,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (category) query.categories = category;
    if (author) query.author = new RegExp(author, 'i');
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { content: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    // Execute query
    const blogs = await Blog.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message
    });
  }
};

// Get blog by ID
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message
    });
  }
};

// Get blog by slug
const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message
    });
  }
};

// Get blogs by category
const getBlogsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ 
      categories: category,
      status: 'published'
    })
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments({ 
      categories: category,
      status: 'published'
    });

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs by category',
      error: error.message
    });
  }
};

// Get blogs by tag
const getBlogsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ 
      tags: tag.toLowerCase(),
      status: 'published'
    })
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments({ 
      tags: tag.toLowerCase(),
      status: 'published'
    });

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs by tag',
      error: error.message
    });
  }
};

// Get blogs by author
const getBlogsByAuthor = async (req, res) => {
  try {
    const { author } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ 
      author: new RegExp(author, 'i'),
      status: 'published'
    })
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments({ 
      author: new RegExp(author, 'i'),
      status: 'published'
    });

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs by author',
      error: error.message
    });
  }
};

// Get published blogs only
const getPublishedBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ status: 'published' })
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments({ status: 'published' });

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching published blogs',
      error: error.message
    });
  }
};

// Search blogs
const searchBlogs = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const blogs = await Blog.find(
      { 
        $text: { $search: q },
        status: 'published'
      },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });

    res.json({
      success: true,
      data: blogs,
      count: blogs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching blogs',
      error: error.message
    });
  }
};

// Get popular blogs (by views)
const getPopularBlogs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const blogs = await Blog.find({ status: 'published' })
      .sort({ views: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: blogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching popular blogs',
      error: error.message
    });
  }
};

// Get recent blogs
const getRecentBlogs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const blogs = await Blog.find({ status: 'published' })
      .sort({ publishedDate: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: blogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recent blogs',
      error: error.message
    });
  }
};

// Create new blog
const createBlog = async (req, res) => {
  try {
    const blogData = req.body;

    // Check for duplicate slug
    if (blogData.slug) {
      const existingBlog = await Blog.findOne({ slug: blogData.slug });
      if (existingBlog) {
        blogData.slug = `${blogData.slug}-${Date.now()}`;
      }
    }

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating blog',
      error: error.message
    });
  }
};

// Update blog
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const blog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating blog',
      error: error.message
    });
  }
};

// Delete blog
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Delete associated images from filesystem
    if (blog.images && blog.images.length > 0) {
      blog.images.forEach(image => {
        const filename = image.url.split('/').pop();
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error('Error deleting image file:', err);
          }
        }
      });
    }

    await Blog.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Blog and associated images deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: error.message
    });
  }
};

// Publish blog
const publishBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    blog.status = 'published';
    blog.publishedDate = new Date();
    await blog.save();

    res.json({
      success: true,
      message: 'Blog published successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error publishing blog',
      error: error.message
    });
  }
};

// Archive blog
const archiveBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    blog.status = 'archived';
    await blog.save();

    res.json({
      success: true,
      message: 'Blog archived successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error archiving blog',
      error: error.message
    });
  }
};

// Like blog
const likeBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    blog.likes += 1;
    await blog.save();

    res.json({
      success: true,
      message: 'Blog liked successfully',
      likes: blog.likes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error liking blog',
      error: error.message
    });
  }
};

// ========== CATEGORY CONTROLLERS ==========

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true }).sort({ name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};

// ========== BANNER CONTROLLERS ==========

// Get all banners
const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: banners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching banners',
      error: error.message
    });
  }
};

// Get active banner
const getActiveBanner = async (req, res) => {
  try {
    const banner = await Banner.findOne({ active: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: banner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active banner',
      error: error.message
    });
  }
};

// Create banner
const createBanner = async (req, res) => {
  try {
    const banner = new Banner(req.body);
    await banner.save();

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating banner',
      error: error.message
    });
  }
};

// Update banner
const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.json({
      success: true,
      message: 'Banner updated successfully',
      data: banner
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating banner',
      error: error.message
    });
  }
};

// Delete banner
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting banner',
      error: error.message
    });
  }
};

// ========== STATISTICS CONTROLLER ==========

const getStatistics = async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const draftBlogs = await Blog.countDocuments({ status: 'draft' });
    const totalViews = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);
    const totalLikes = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: '$likes' } } }
    ]);

    const categoryStats = await Blog.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        totalViews: totalViews[0]?.total || 0,
        totalLikes: totalLikes[0]?.total || 0,
        categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// ============================================
// ROUTES
// ============================================

// Image Upload Routes
app.post('/api/upload-image', upload.single('image'), uploadImage);
app.post('/api/upload-images', upload.array('images', 10), uploadMultipleImages);
app.delete('/api/delete-image/:filename', deleteImage);

// Blog Routes
app.get('/api/blogs', getAllBlogs);
app.get('/api/blogs/published', getPublishedBlogs);
app.get('/api/blogs/popular', getPopularBlogs);
app.get('/api/blogs/recent', getRecentBlogs);
app.get('/api/blogs/search', searchBlogs);
app.get('/api/blogs/category/:category', getBlogsByCategory);
app.get('/api/blogs/tag/:tag', getBlogsByTag);
app.get('/api/blogs/author/:author', getBlogsByAuthor);
app.get('/api/blogs/:id', getBlogById);
app.get('/api/blogs/slug/:slug', getBlogBySlug);
app.post('/api/blogs', createBlog);
app.put('/api/blogs/:id', updateBlog);
app.delete('/api/blogs/:id', deleteBlog);
app.patch('/api/blogs/:id/publish', publishBlog);
app.patch('/api/blogs/:id/archive', archiveBlog);
app.patch('/api/blogs/:id/like', likeBlog);

// Category Routes
app.get('/api/categories', getAllCategories);
app.get('/api/categories/:id', getCategoryById);
app.post('/api/categories', createCategory);
app.put('/api/categories/:id', updateCategory);
app.delete('/api/categories/:id', deleteCategory);

// Banner Routes
app.get('/api/banners', getAllBanners);
app.get('/api/banners/active', getActiveBanner);
app.post('/api/banners', createBanner);
app.put('/api/banners/:id', updateBanner);
app.delete('/api/banners/:id', deleteBanner);

// Statistics Route
app.get('/api/statistics', getStatistics);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    timestamp: new Date()
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📂 Images stored in: ${uploadsDir}`);
  console.log(`🌐 Access images at: http://localhost:${PORT}/images/filename.jpg`);
  console.log(`📝 API Documentation:`);
  console.log(`   POST   /api/upload-image - Upload single image`);
  console.log(`   POST   /api/upload-images - Upload multiple images`);
  console.log(`   DELETE /api/delete-image/:filename - Delete image`);
  console.log(`   GET    /api/blogs - Get all blogs`);
  console.log(`   GET    /api/blogs/:id - Get blog by ID`);
  console.log(`   GET    /api/blogs/slug/:slug - Get blog by slug`);
  console.log(`   GET    /api/blogs/published - Get published blogs`);
  console.log(`   GET    /api/blogs/popular - Get popular blogs`);
  console.log(`   GET    /api/blogs/recent - Get recent blogs`);
  console.log(`   GET    /api/blogs/category/:category - Get blogs by category`);
  console.log(`   GET    /api/blogs/tag/:tag - Get blogs by tag`);
  console.log(`   GET    /api/blogs/author/:author - Get blogs by author`);
  console.log(`   GET    /api/blogs/search?q=term - Search blogs`);
  console.log(`   POST   /api/blogs - Create new blog`);
  console.log(`   PUT    /api/blogs/:id - Update blog`);
  console.log(`   DELETE /api/blogs/:id - Delete blog`);
  console.log(`   PATCH  /api/blogs/:id/publish - Publish blog`);
  console.log(`   PATCH  /api/blogs/:id/archive - Archive blog`);
  console.log(`   PATCH  /api/blogs/:id/like - Like blog`);
  console.log(`   GET    /api/categories - Get all categories`);
  console.log(`   GET    /api/banners - Get all banners`);
  console.log(`   GET    /api/statistics - Get statistics`);
});