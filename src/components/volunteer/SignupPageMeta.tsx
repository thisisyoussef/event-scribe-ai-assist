
import { useEffect } from 'react';
import { Event } from '@/types/database';
import { displayTimeInMichigan } from '@/utils/timezoneUtils';

interface SignupPageMetaProps {
  event: Event | null;
}

const SignupPageMeta = ({ event }: SignupPageMetaProps) => {
  useEffect(() => {
    if (!event) return;

    const formatDateTime = (dateTime: string) => {
      const date = new Date(dateTime);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const formatDate = (dateTime: string) => {
      const date = new Date(dateTime);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (dateTime: string) => {
      return displayTimeInMichigan(dateTime);
    };

    // Update page title
    document.title = `Volunteer for ${event.title}`;

    // Remove existing meta tags to ensure fresh data
    const removeExistingMeta = (selector: string) => {
      const existing = document.querySelectorAll(selector);
      existing.forEach(tag => tag.remove());
    };

    // Remove existing meta tags
    removeExistingMeta('meta[property^="og:"]');
    removeExistingMeta('meta[name^="twitter:"]');
    removeExistingMeta('meta[name="description"]');

    // Create or update meta tags
    const updateMetaTag = (property: string, content: string) => {
      const meta = document.createElement('meta');
      if (property.startsWith('og:') || property.startsWith('twitter:')) {
        meta.setAttribute('property', property);
      } else {
        meta.setAttribute('name', property);
      }
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    };

    const eventDate = formatDate(event.start_datetime);
    const eventTime = formatTime(event.start_datetime);
    const eventDateTime = formatDateTime(event.start_datetime);
    const description = event.description 
      ? event.description.length > 100 
        ? `${event.description.substring(0, 100)}...` 
        : event.description
      : `Join us as a volunteer and help make ${event.title} a success!`;

    // Enhanced meta description for WhatsApp
    const metaDescription = `Volunteer Signup: ${event.title}\n📅 ${eventDate} at ${eventTime}\n📍 ${event.location || 'Location TBA'}\n\nSign up now to volunteer!`;

    // Basic meta tags - force override
    updateMetaTag('description', metaDescription);
    
    // Open Graph tags for rich link previews (WhatsApp uses these)
    updateMetaTag('og:title', `Volunteer Signup: ${event.title}`);
    updateMetaTag('og:description', `📅 ${eventDateTime}\n📍 ${event.location || 'Location TBA'}\n\n${description}\n\n✅ Sign up now to volunteer and be part of something amazing!`);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:site_name', 'UMMA Event Volunteers');
    updateMetaTag('og:locale', 'en_US');
    updateMetaTag('og:image', 'https://via.placeholder.com/1200x630/9B9A6D/FFFFFF?text=Volunteer+Signup');
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:image:alt', `Volunteer signup for ${event.title}`);
    
    // Twitter Card tags (fallback for some platforms)
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', `Volunteer for ${event.title}`);
    updateMetaTag('twitter:description', `📅 ${eventDate} at ${eventTime}\n📍 ${event.location || 'Location TBA'}\n\n${description}\n\nSign up to volunteer today!`);
    updateMetaTag('twitter:site', '@umma');
    updateMetaTag('twitter:creator', '@umma');
    updateMetaTag('twitter:image', 'https://via.placeholder.com/1200x630/9B9A6D/FFFFFF?text=Volunteer+Signup');

    // Additional structured data for better SEO and previews
    updateMetaTag('article:section', 'Volunteer Opportunities');
    updateMetaTag('article:tag', 'volunteer,community,event,signup,umma');
    updateMetaTag('event:start_time', event.start_datetime);
    updateMetaTag('event:location:latitude', '');
    updateMetaTag('event:location:longitude', '');

    // Force refresh of link preview cache for WhatsApp
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.remove();
    }
    const canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', window.location.href);
    document.head.appendChild(canonical);

    // Cleanup function to restore original title
    return () => {
      document.title = 'UMMA Event Management';
    };
  }, [event]);

  return null; // This component doesn't render anything
};

export default SignupPageMeta;
