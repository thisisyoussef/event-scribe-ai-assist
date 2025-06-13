
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

    // Update page title
    document.title = `Volunteer Signup - ${event.title}`;

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

    const description = event.description 
      ? `${event.description.substring(0, 150)}...` 
      : `Join us as a volunteer for ${event.title}`;

    // Basic meta tags
    updateMetaTag('description', `Volunteer signup for ${event.title} - ${formatDateTime(event.start_datetime)}`);
    
    // Open Graph tags
    updateMetaTag('og:title', `🤝 Volunteer Signup: ${event.title}`);
    updateMetaTag('og:description', `Sign up to volunteer for ${event.title} on ${formatDateTime(event.start_datetime)}. ${description}`);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:url', window.location.href);
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', `🤝 Volunteer Signup: ${event.title}`);
    updateMetaTag('twitter:description', `Sign up to volunteer for ${event.title} on ${formatDateTime(event.start_datetime)}`);

    // Cleanup function to restore original title
    return () => {
      document.title = 'UMMA Event Management';
    };
  }, [event]);

  return null; // This component doesn't render anything
};

export default SignupPageMeta;
