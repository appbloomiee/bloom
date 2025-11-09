// models/Blog.js
const mongoose = require('mongoose');
const slugify = require('slugify');

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
      enum: {
        values: ['Plant','Pet','Food','Medicine'],
        message: '{VALUE} is not a valid category'
      },
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
        required: [true, 'Image URL is required'],
        validate: {
          validator: function(v) {
            // Validate URL or base64 string
            return /^(https?:\/\/.+|data:image\/.+;base64,.+)$/.test(v);
          },
          message: 'Invalid image format. Must be URL or base64 string'
        }
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
    
    
    likes: {
      type: Number,
      default: 0,
      min: [0, 'Likes cannot be negative']
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
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
blogSchema.index({ title: 'text', content: 'text' }); // Text search
blogSchema.index({ createdAt: -1 }); // Sort by newest
blogSchema.index({ views: -1 }); // Sort by most viewed
blogSchema.index({ category: 1, status: 1 }); // Category + status queries
blogSchema.index({ featured: 1, status: 1 }); // Featured posts queries

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
  if (this.isModified('title') && !this.slug) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  next();
});

// Pre-save middleware to generate excerpt if not provided
blogSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.excerpt) {
    // Strip HTML tags and get first 200 characters
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

// Pre-save middleware to set featured image
blogSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0 && !this.featuredImage.url) {
    this.featuredImage = {
      url: this.images[0].url,
      alt: this.images[0].alt || this.title
    };
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

// Static method to get published blogs
blogSchema.statics.getPublished = function() {
  return this.find({ status: 'published' })
    .sort({ publishedDate: -1 });
};

// Static method to get featured blogs
blogSchema.statics.getFeatured = function(limit = 5) {
  return this.find({ featured: true, status: 'published' })
    .sort({ publishedDate: -1 })
    .limit(limit);
};

// Static method to get blogs by category
blogSchema.statics.getByCategory = function(category) {
  return this.find({ category, status: 'published' })
    .sort({ publishedDate: -1 });
};

// Static method to search blogs
blogSchema.statics.searchBlogs = function(searchTerm) {
  return this.find(
    { 
      $text: { $search: searchTerm },
      status: 'published'
    },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Instance method to increment views
blogSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to increment likes
blogSchema.methods.incrementLikes = function() {
  this.likes += 1;
  return this.save();
};

// Instance method to publish blog
blogSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedDate = new Date();
  return this.save();
};

// Instance method to archive blog
blogSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;


// ============================================
// CATEGORY MODEL (Separate for better management)
// ============================================

// models/Category.js
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

// Generate slug before save
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
// BANNER MODEL
// ============================================




// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Create a new blog
const newBlog = new Blog({
  title: 'Getting Started with Node.js',
  content: '<p>This is the blog content with <strong>HTML</strong> formatting...</p>',
  author: 'John Doe',
  category: 'Technology',
  tags: ['nodejs', 'javascript', 'backend'],
  images: [{
    url: 'https://example.com/image.jpg',
    alt: 'Node.js logo',
    caption: 'Official Node.js logo'
  }],
  featured: true,
  status: 'published'
});

await newBlog.save();

// Find all published blogs
const blogs = await Blog.getPublished();

// Get featured blogs
const featuredBlogs = await Blog.getFeatured(5);

// Search blogs
const searchResults = await Blog.searchBlogs('node.js tutorial');

// Get blogs by category
const techBlogs = await Blog.getByCategory('Technology');

// Increment views
const blog = await Blog.findById(blogId);
await blog.incrementViews();

// Publish a draft
const draft = await Blog.findById(draftId);
await draft.publish();

// Create a category
const category = new Category({
  name: 'Technology',
  description: 'All tech-related posts',
  color: '#3B82F6'
});
await category.save();

// Create a banner
const banner = new Banner({
  header: 'Welcome to Our Blog',
  text: 'Discover amazing content every day',
  buttonText: 'Read More',
  buttonLink: '/blog',
  active: true
});
await banner.save();
*/

module.exports = { Blog, Category, Banner };