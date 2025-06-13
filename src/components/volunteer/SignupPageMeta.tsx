
import { useEffect } from 'react';
import { Event } from '@/types/database';

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
      const date = new Date(dateTime);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    // Update page title
    document.title = `🤝 Volunteer for ${event.title} - Sign Up Now`;

    // Create or update meta tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) || 
                 document.querySelector(`meta[name="${property}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    const eventDate = formatDate(event.start_datetime);
    const eventTime = formatTime(event.start_datetime);
    const eventDateTime = formatDateTime(event.start_datetime);
    const description = event.description 
      ? event.description.length > 100 
        ? `${event.description.substring(0, 100)}...` 
        : event.description
      : `Join us as a volunteer and help make ${event.title} a success!`;

    // Enhanced meta description
    const metaDescription = `🤝 Volunteer Signup for ${event.title} | 📅 ${eventDate} at ${eventTime} | ${event.location || 'TBA'} | Sign up now to help make this event amazing!`;

    // Basic meta tags
    updateMetaTag('description', metaDescription);
    
    // Open Graph tags for rich link previews
    updateMetaTag('og:title', `🤝 Volunteer Signup: ${event.title}`);
    updateMetaTag('og:description', `📅 ${eventDateTime}\n📍 ${event.location || 'Location TBA'}\n\n${description}\n\n✅ Sign up now to volunteer and be part of something amazing!`);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:site_name', 'UMMA Event Volunteers');
    updateMetaTag('og:locale', 'en_US');
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', `🤝 Volunteer for ${event.title}`);
    updateMetaTag('twitter:description', `📅 ${eventDate} at ${eventTime}\n📍 ${event.location || 'Location TBA'}\n\n${description}\n\nSign up to volunteer today!`);
    updateMetaTag('twitter:site', '@umma');
    updateMetaTag('twitter:creator', '@umma');

    // Additional structured data for better SEO and previews
    updateMetaTag('article:section', 'Volunteer Opportunities');
    updateMetaTag('article:tag', 'volunteer,community,event,signup,umma');
    updateMetaTag('event:start_time', event.start_datetime);
    updateMetaTag('event:location:latitude', '');
    updateMetaTag('event:location:longitude', '');

    // Cleanup function to restore original title
    return () => {
      document.title = 'UMMA Event Management';
    };
  }, [event]);

  return null; // This component doesn't render anything
};

export default SignupPageMeta;
