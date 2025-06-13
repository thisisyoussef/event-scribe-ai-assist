
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
    document.title = `🤝 Volunteer Signup - ${event.title}`;

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
    const description = event.description 
      ? `${event.description.substring(0, 120)}...` 
      : `Help make ${event.title} successful by volunteering!`;

    // Basic meta tags
    updateMetaTag('description', `🤝 Volunteer Signup for ${event.title} - ${eventDate} at ${eventTime}. Sign up to help make this event successful!`);
    
    // Open Graph tags for rich link previews
    updateMetaTag('og:title', `🤝 Volunteer Signup: ${event.title}`);
    updateMetaTag('og:description', `📅 ${eventDate} at ${eventTime}\n\n${description}\n\nSign up now to volunteer and help make this event amazing!`);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:site_name', 'UMMA Events');
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', `🤝 Volunteer Signup: ${event.title}`);
    updateMetaTag('twitter:description', `📅 ${eventDate} at ${eventTime} - ${description} Sign up to volunteer!`);
    updateMetaTag('twitter:site', '@umma');

    // Additional structured data for better SEO
    updateMetaTag('article:section', 'Volunteer Opportunities');
    updateMetaTag('article:tag', 'volunteer,community,event,signup');

    // Cleanup function to restore original title
    return () => {
      document.title = 'UMMA Event Management';
    };
  }, [event]);

  return null; // This component doesn't render anything
};

export default SignupPageMeta;
