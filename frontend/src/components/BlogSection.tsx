import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, User, ArrowRight, Loader } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  imageUrl?: string;
  tags?: string[];
}

interface BlogSectionProps {
  hasAccess: boolean;
}

export const BlogSection: React.FC<BlogSectionProps> = ({ hasAccess }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  // Load blog posts from API or local storage
  useEffect(() => {
    loadBlogPosts();
  }, []);

  const loadBlogPosts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call when backend is ready
      // For now, load from localStorage or use mock data
      const storedPosts = localStorage.getItem('blogPosts');
      
      if (storedPosts) {
        const parsedPosts = JSON.parse(storedPosts);
        setPosts(parsedPosts);
      } else {
        // Mock data for demonstration
        const mockPosts: BlogPost[] = [
          {
            id: '1',
            title: 'Welcome to Dr. Birdy Books Protocol',
            excerpt: 'Learn about our revolutionary approach to decentralized education and content access through tokenized staking.',
            content: 'The Dr. Birdy Books Protocol represents a new paradigm in educational content distribution. By leveraging blockchain technology and tokenized staking mechanisms, we create a sustainable ecosystem where learners can access premium educational materials while supporting content creators.',
            author: 'Dr. Birdy Team',
            publishedAt: new Date().toISOString(),
            tags: ['Education', 'DeFi', 'Blockchain'],
          },
          {
            id: '2',
            title: 'Understanding Tier-Based Access',
            excerpt: 'Discover how our tiered staking system works and what content is available at each level.',
            content: 'Our platform uses a flexible tiered staking system that grants access based on the USD value of staked tokens. Tier 1 ($24) provides basic access, Tier 2 ($50) offers advanced materials, and Tier 3 ($1000) unlocks premium content including masterclasses and exclusive research.',
            author: 'Dr. Birdy Team',
            publishedAt: new Date(Date.now() - 86400000).toISOString(),
            tags: ['Staking', 'Tiers', 'Access'],
          },
        ];
        setPosts(mockPosts);
        localStorage.setItem('blogPosts', JSON.stringify(mockPosts));
      }
    } catch (err: any) {
      setError('Failed to load blog posts: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Required
          </h3>
          <p className="text-gray-600">
            Please stake tokens to access our blog content
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading blog posts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (selectedPost) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => setSelectedPost(null)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
        >
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          Back to Blog
        </button>
        
        <article>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {selectedPost.title}
          </h1>
          
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <User className="h-4 w-4 mr-2" />
            <span className="mr-4">{selectedPost.author}</span>
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDate(selectedPost.publishedAt)}</span>
          </div>

          {selectedPost.imageUrl && (
            <img
              src={selectedPost.imageUrl}
              alt={selectedPost.title}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}

          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {selectedPost.content}
            </p>
          </div>

          {selectedPost.tags && selectedPost.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {selectedPost.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <BookOpen className="h-6 w-6 text-blue-600 mr-2" />
          Blog
        </h2>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
          {posts.length} {posts.length === 1 ? 'Post' : 'Posts'}
        </span>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No blog posts available yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Check back soon for updates and educational content
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <User className="h-4 w-4 mr-1" />
                    <span className="mr-4">{post.author}</span>
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{formatDate(post.publishedAt)}</span>
                  </div>

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                    Read More
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>

                {post.imageUrl && (
                  <div className="ml-6 flex-shrink-0">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};


