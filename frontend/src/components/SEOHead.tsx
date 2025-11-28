import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  noindex?: boolean;
}

export function SEOHead({
  title,
  description,
  keywords,
  image,
  noindex = false,
}: SEOHeadProps) {
  const location = useLocation();

  useEffect(() => {
    // Update document title
    const defaultTitle = 'Dr Birdy Books Protocol Token | DeFi Education Platform on Base Network';
    document.title = title ? `${title} | Dr Birdy Books Protocol Token` : defaultTitle;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        description ||
          'Revolutionary DeFi ecosystem bridging education, media, and cryptocurrency. Access premium educational content through tiered staking on Base Network.'
      );
    }

    // Update meta keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords);
    }

    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute(
        'content',
        title ? `${title} | Dr Birdy Books Protocol Token` : defaultTitle
      );
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute(
        'content',
        description ||
          'Revolutionary DeFi ecosystem bridging education, media, and cryptocurrency. Access premium educational content through tiered staking on Base Network.'
      );
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      const baseUrl = 'https://drbirdybooks.com';
      ogUrl.setAttribute('content', `${baseUrl}${location.pathname}`);
    }

    if (image) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        ogImage.setAttribute('content', image);
      }
    }

    // Update Twitter tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute(
        'content',
        title ? `${title} | Dr Birdy Books Protocol Token` : defaultTitle
      );
    }

    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute(
        'content',
        description ||
          'Revolutionary DeFi ecosystem bridging education, media, and cryptocurrency. Access premium educational content through tiered staking on Base Network.'
      );
    }

    // Update canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      const baseUrl = 'https://drbirdybooks.com';
      canonical.setAttribute('href', `${baseUrl}${location.pathname}`);
    }

    // Handle noindex
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) {
      if (noindex) {
        robots.setAttribute('content', 'noindex, nofollow');
      } else {
        robots.setAttribute('content', 'index, follow');
      }
    }
  }, [title, description, keywords, image, noindex, location.pathname]);

  return null;
}

