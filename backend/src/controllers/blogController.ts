import { Response } from 'express';
import BlogPost from '../models/BlogPost';
import Analytics from '../models/Analytics';
import { AuthRequest } from '../middleware/auth';

// @desc    Get all blog posts (with filters)
// @route   GET /api/blog
// @access  Public
export const getBlogPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, tag, search, limit = 20, page = 1 } = req.query;
    
    const query: any = {};
    
    // Filter by status (default to published for public access)
    if (status) {
      query.status = status;
    } else if (!req.admin) {
      // Non-admin users can only see published posts
      query.status = 'published';
    }
    
    // Filter by tag
    if (tag) {
      query.tags = tag;
    }
    
    // Search in title and content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .lean(),
      BlogPost.countDocuments(query),
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get blog posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog posts',
      error: error.message,
    });
  }
};

// @desc    Get single blog post
// @route   GET /api/blog/:id
// @access  Public
export const getBlogPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const post = await BlogPost.findById(id);
    
    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
      return;
    }
    
    // Only allow viewing published posts for non-admin users
    if (!req.admin && post.status !== 'published') {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }
    
    // Increment view count
    post.views += 1;
    await post.save();
    
    // Track analytics
    await Analytics.create({
      eventType: 'blog_view',
      blogPostId: post._id,
      timestamp: new Date(),
    });
    
    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error: any) {
    console.error('Get blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog post',
      error: error.message,
    });
  }
};

// @desc    Create blog post
// @route   POST /api/blog
// @access  Private
export const createBlogPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, excerpt, imageUrl, tags, status } = req.body;
    
    if (!title || !content || !excerpt) {
      res.status(400).json({
        success: false,
        message: 'Please provide title, content, and excerpt',
      });
      return;
    }
    
    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check if slug already exists
    const existingPost = await BlogPost.findOne({ slug });
    if (existingPost) {
      res.status(400).json({
        success: false,
        message: 'A post with this title already exists',
      });
      return;
    }
    
    const post = await BlogPost.create({
      title,
      content,
      excerpt,
      author: req.admin?.username || 'Admin',
      authorId: req.admin?.id,
      slug,
      imageUrl,
      tags: tags || [],
      status: status || 'draft',
    });
    
    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: post,
    });
  } catch (error: any) {
    console.error('Create blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create blog post',
      error: error.message,
    });
  }
};

// @desc    Update blog post
// @route   PUT /api/blog/:id
// @access  Private
export const updateBlogPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, imageUrl, tags, status } = req.body;
    
    const post = await BlogPost.findById(id);
    
    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
      return;
    }
    
    // Update fields
    if (title) post.title = title;
    if (content) post.content = content;
    if (excerpt) post.excerpt = excerpt;
    if (imageUrl !== undefined) post.imageUrl = imageUrl;
    if (tags) post.tags = tags;
    if (status) post.status = status;
    
    await post.save();
    
    res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      data: post,
    });
  } catch (error: any) {
    console.error('Update blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog post',
      error: error.message,
    });
  }
};

// @desc    Delete blog post
// @route   DELETE /api/blog/:id
// @access  Private
export const deleteBlogPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const post = await BlogPost.findById(id);
    
    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
      return;
    }
    
    await post.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog post',
      error: error.message,
    });
  }
};




