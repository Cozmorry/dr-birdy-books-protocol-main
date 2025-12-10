import { Response } from 'express';
import BlogPost from '../models/BlogPost';
import Analytics from '../models/Analytics';
import { AuthRequest } from '../middleware/auth';
import { uploadToS3, generatePresignedDownloadUrl } from '../services/s3Service';
import path from 'path';

/**
 * Extract S3 key from various S3 URL formats
 * Handles both direct URLs and pre-signed URLs
 */
function extractS3KeyFromUrl(url: string, bucketName: string): string | null {
  if (!url || !url.includes('s3')) {
    return null;
  }

  try {
    // First, decode the URL in case it's double-encoded
    let decodedUrl = decodeURIComponent(url);
    
    // Remove query parameters (for pre-signed URLs)
    const urlWithoutQuery = decodedUrl.split('?')[0];
    
    // Handle virtual-hosted-style URL: https://bucket.s3.region.amazonaws.com/key
    const virtualHostedRegex = new RegExp(`${bucketName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.s3[^/]+\\.amazonaws\\.com/(.+)$`, 'i');
    const virtualMatch = urlWithoutQuery.match(virtualHostedRegex);
    if (virtualMatch && virtualMatch[1]) {
      const key = decodeURIComponent(virtualMatch[1]);
      // Remove any trailing query params that might have been part of the key
      return key.split('?')[0];
    }

    // Handle path-style URL: https://s3.region.amazonaws.com/bucket/key
    const pathStyleRegex = /s3[^/]+\.amazonaws\.com\/[^/]+\/(.+)$/i;
    const pathMatch = urlWithoutQuery.match(pathStyleRegex);
    if (pathMatch && pathMatch[1]) {
      const key = decodeURIComponent(pathMatch[1]);
      // Remove any trailing query params that might have been part of the key
      return key.split('?')[0];
    }

    // Handle s3:// URLs
    if (urlWithoutQuery.startsWith('s3://')) {
      const s3Match = urlWithoutQuery.match(/^s3:\/\/[^/]+\/(.+)$/);
      if (s3Match && s3Match[1]) {
        const key = decodeURIComponent(s3Match[1]);
        return key.split('?')[0];
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    console.error('URL:', url);
    return null;
  }
}

// @desc    Get all blog posts (with filters)
// @route   GET /api/blog
// @access  Public
export const getBlogPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, tag, search, limit = 20, page = 1 } = req.query;
    
    const query: any = {};
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status && !req.admin) {
      // Non-admin users can only see published posts (if no status specified)
      query.status = 'published';
    }
    // If status is 'all' or admin is requesting without status, don't filter by status (show all)
    
    console.log('📝 Blog posts query:', { query, isAdmin: !!req.admin, status });
    
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
    
    // Convert S3 URLs to pre-signed URLs (always use pre-signed URLs for reliability)
    const storageType = (process.env.STORAGE_TYPE || 'mongodb').toLowerCase();
    if (storageType === 's3') {
      const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'dr-birdy-books-files';
      // Process posts and update imageUrls (need to map since .lean() returns plain objects)
      const postsWithPresignedUrls = await Promise.all(
        posts.map(async (post) => {
          if (post.imageUrl && post.imageUrl.includes('s3')) {
            try {
              const s3Key = extractS3KeyFromUrl(post.imageUrl, bucketName);
              
              if (s3Key) {
                // Generate pre-signed URL with 7 days expiration (max allowed for SigV4)
                const presignedUrl = await generatePresignedDownloadUrl(s3Key, 604800); // 7 days
                console.log(`✅ Generated pre-signed URL for blog image: ${s3Key.substring(0, 50)}...`);
                console.log(`   Original URL: ${post.imageUrl.substring(0, 80)}...`);
                console.log(`   Pre-signed URL: ${presignedUrl.substring(0, 100)}...`);
                return { ...post, imageUrl: presignedUrl };
              } else {
                console.warn('⚠️  Could not extract S3 key from URL:', post.imageUrl);
                return post;
              }
            } catch (error: any) {
              console.error('❌ Failed to generate pre-signed URL for blog image:', error.message);
              console.error('   URL:', post.imageUrl);
              // Keep original URL if pre-signed URL generation fails
              return post;
            }
          }
          return post;
        })
      );
      
      // Replace posts array with updated versions
      posts.length = 0;
      posts.push(...postsWithPresignedUrls);
    }
    
    console.log(`✅ Found ${posts.length} blog posts (total: ${total})`);
    
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
    
    // Convert S3 URL to pre-signed URL (always use pre-signed URLs for reliability)
    const storageType = (process.env.STORAGE_TYPE || 'mongodb').toLowerCase();
    if (storageType === 's3' && post.imageUrl && post.imageUrl.includes('s3')) {
      try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'dr-birdy-books-files';
        const s3Key = extractS3KeyFromUrl(post.imageUrl, bucketName);
        
        if (s3Key) {
          // Generate pre-signed URL with 7 days expiration (max allowed for SigV4)
          const presignedUrl = await generatePresignedDownloadUrl(s3Key, 604800); // 7 days
          post.imageUrl = presignedUrl;
          console.log(`✅ Generated pre-signed URL for blog image: ${s3Key.substring(0, 50)}...`);
        } else {
          console.warn('⚠️  Could not extract S3 key from URL:', post.imageUrl);
        }
      } catch (error: any) {
        console.error('❌ Failed to generate pre-signed URL for blog image:', error.message);
        console.error('   URL:', post.imageUrl);
        // Keep original URL if pre-signed URL generation fails
      }
    }
    
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
    
    // Handle image upload if file is provided
    let finalImageUrl = imageUrl;
    if (req.file && req.file.buffer) {
      try {
        const storageType = (process.env.STORAGE_TYPE || 'mongodb').toLowerCase();
        
        if (storageType === 's3') {
          // Upload blog image to S3
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = path.extname(req.file.originalname);
          const nameWithoutExt = path.basename(req.file.originalname, ext);
          const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');
          const filename = `blog-${uniqueSuffix}-${sanitizedName}${ext}`;
          const s3Key = `blog-images/${filename}`;
          
          // Upload blog image to S3 (bucket doesn't support ACLs, so we'll use pre-signed URLs)
          await uploadToS3(
            req.file.buffer,
            s3Key,
            req.file.mimetype,
            {
              originalName: req.file.originalname,
              uploadedBy: req.admin?.id?.toString() || 'unknown',
              uploadedByName: req.admin?.username || 'Admin',
            },
            false // isPublic = false (bucket doesn't support ACLs)
          );
          
          // Generate pre-signed URL with 7 days expiration (max allowed for SigV4)
          const presignedUrl = await generatePresignedDownloadUrl(s3Key, 604800); // 7 days
          finalImageUrl = presignedUrl;
          
          console.log('✅ Blog image uploaded to S3, pre-signed URL generated');
        } else {
          // For MongoDB/other storage, you could upload to files endpoint first
          // For now, we'll just use the provided imageUrl
          console.log('⚠️  Image upload only supported with S3 storage');
        }
      } catch (imageError: any) {
        console.error('❌ Blog image upload error:', imageError);
        // Continue without image if upload fails
      }
    }
    
    const post = await BlogPost.create({
      title,
      content,
      excerpt,
      author: req.admin?.username || 'Admin',
      authorId: req.admin?.id,
      slug,
      imageUrl: finalImageUrl,
      tags: tags || [],
      status: status || 'draft',
    });
    
    console.log('✅ Blog post created:', {
      id: post._id,
      title: post.title,
      status: post.status,
      publishedAt: post.publishedAt,
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
    
    // Handle image upload if new file is provided
    let finalImageUrl = imageUrl !== undefined ? imageUrl : post.imageUrl;
    if (req.file && req.file.buffer) {
      try {
        const storageType = (process.env.STORAGE_TYPE || 'mongodb').toLowerCase();
        
        if (storageType === 's3') {
          // Upload blog image to S3
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = path.extname(req.file.originalname);
          const nameWithoutExt = path.basename(req.file.originalname, ext);
          const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');
          const filename = `blog-${uniqueSuffix}-${sanitizedName}${ext}`;
          const s3Key = `blog-images/${filename}`;
          
          // Upload blog image to S3 (bucket doesn't support ACLs, so we'll use pre-signed URLs)
          await uploadToS3(
            req.file.buffer,
            s3Key,
            req.file.mimetype,
            {
              originalName: req.file.originalname,
              uploadedBy: req.admin?.id?.toString() || 'unknown',
              uploadedByName: req.admin?.username || 'Admin',
            },
            false // isPublic = false (bucket doesn't support ACLs)
          );
          
          // Generate pre-signed URL with 7 days expiration (max allowed for SigV4)
          const presignedUrl = await generatePresignedDownloadUrl(s3Key, 604800); // 7 days
          finalImageUrl = presignedUrl;
          
          console.log('✅ Blog image uploaded to S3, pre-signed URL generated');
        } else {
          console.log('⚠️  Image upload only supported with S3 storage');
        }
      } catch (imageError: any) {
        console.error('❌ Blog image upload error:', imageError);
        // Continue without updating image if upload fails
      }
    }
    
    // Update fields
    if (title) post.title = title;
    if (content) post.content = content;
    if (excerpt) post.excerpt = excerpt;
    if (imageUrl !== undefined || (req.file && req.file.buffer)) {
      post.imageUrl = finalImageUrl;
    }
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




