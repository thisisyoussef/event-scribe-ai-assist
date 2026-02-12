import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsTrackingData {
  eventId: string;
  trackingType: 'link_click' | 'qr_scan' | 'page_view' | 'human_click';
  visitorId?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
}

export interface AnalyticsSummary {
  total_clicks: number;
  qr_scans: number;
  human_clicks: number;
  unique_clicks: number;
  visitors: number;
  page_views: number;
}

export interface AnalyticsFilteredData {
  tracking_type: string;
  device_type?: string;
  country?: string;
  click_count: number;
  unique_visitors: number;
  date_group: string;
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  trackingTypes?: string[];
  deviceTypes?: string[];
  countries?: string[];
}

// Generate a unique visitor ID
export const generateVisitorId = (): string => {
  return 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

// Get visitor ID from localStorage or create new one
export const getVisitorId = (): string => {
  const stored = localStorage.getItem('analytics_visitor_id');
  if (stored) {
    return stored;
  }
  
  const newId = generateVisitorId();
  localStorage.setItem('analytics_visitor_id', newId);
  return newId;
};

// Detect device type from user agent
export const detectDeviceType = (userAgent: string): 'desktop' | 'mobile' | 'tablet' => {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  }
  
  return 'desktop';
};

// Detect browser from user agent
export const detectBrowser = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('edge')) return 'Edge';
  if (ua.includes('opera')) return 'Opera';
  
  return 'Unknown';
};

// Detect OS from user agent
export const detectOS = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  
  return 'Unknown';
};

// Track analytics event
export const trackAnalytics = async (data: AnalyticsTrackingData): Promise<boolean> => {
  try {
    const { data: result, error } = await supabase.rpc('track_analytics', {
      p_event_id: data.eventId,
      p_tracking_type: data.trackingType,
      p_visitor_id: data.visitorId,
      p_user_agent: data.userAgent,
      p_ip_address: data.ipAddress,
      p_referrer: data.referrer,
      p_utm_source: data.utmSource,
      p_utm_medium: data.utmMedium,
      p_utm_campaign: data.utmCampaign,
      p_device_type: data.deviceType,
      p_browser: data.browser,
      p_os: data.os,
      p_country: data.country,
      p_city: data.city,
    });

    if (error) {
      console.error('Error tracking analytics:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error tracking analytics:', error);
    return false;
  }
};

// Track page view
export const trackPageView = async (eventId: string): Promise<boolean> => {
  const visitorId = getVisitorId();
  const userAgent = navigator.userAgent;
  
  return trackAnalytics({
    eventId,
    trackingType: 'page_view',
    visitorId,
    userAgent,
    deviceType: detectDeviceType(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    referrer: document.referrer || undefined,
  });
};

// Track link click
export const trackLinkClick = async (eventId: string, utmParams?: {
  source?: string;
  medium?: string;
  campaign?: string;
}): Promise<boolean> => {
  const visitorId = getVisitorId();
  const userAgent = navigator.userAgent;
  
  return trackAnalytics({
    eventId,
    trackingType: 'link_click',
    visitorId,
    userAgent,
    deviceType: detectDeviceType(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    referrer: document.referrer || undefined,
    utmSource: utmParams?.source,
    utmMedium: utmParams?.medium,
    utmCampaign: utmParams?.campaign,
  });
};

// Track QR scan
export const trackQRScan = async (eventId: string): Promise<boolean> => {
  const visitorId = getVisitorId();
  const userAgent = navigator.userAgent;
  
  return trackAnalytics({
    eventId,
    trackingType: 'qr_scan',
    visitorId,
    userAgent,
    deviceType: detectDeviceType(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
  });
};

// Track human click (manual interaction)
export const trackHumanClick = async (eventId: string): Promise<boolean> => {
  const visitorId = getVisitorId();
  const userAgent = navigator.userAgent;
  
  return trackAnalytics({
    eventId,
    trackingType: 'human_click',
    visitorId,
    userAgent,
    deviceType: detectDeviceType(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
  });
};

// Get analytics summary for an event
export const getAnalyticsSummary = async (
  eventId: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    trackingType?: string;
  }
): Promise<AnalyticsSummary | null> => {
  try {
    const { data, error } = await supabase.rpc('get_event_analytics_summary', {
      p_event_id: eventId,
      p_date_from: filters?.dateFrom,
      p_date_to: filters?.dateTo,
      p_tracking_type: filters?.trackingType,
    });

    if (error) {
      console.error('Error getting analytics summary:', error);
      return null;
    }

    return data?.[0] || {
      total_clicks: 0,
      qr_scans: 0,
      human_clicks: 0,
      unique_clicks: 0,
      visitors: 0,
      page_views: 0,
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return null;
  }
};

// Get filtered analytics data
export const getFilteredAnalytics = async (
  eventId: string,
  filters: AnalyticsFilters
): Promise<AnalyticsFilteredData[]> => {
  try {
    const { data, error } = await supabase.rpc('get_analytics_with_filters', {
      p_event_id: eventId,
      p_date_from: filters.dateFrom,
      p_date_to: filters.dateTo,
      p_tracking_types: filters.trackingTypes,
      p_device_types: filters.deviceTypes,
      p_countries: filters.countries,
    });

    if (error) {
      console.error('Error getting filtered analytics:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting filtered analytics:', error);
    return [];
  }
};

// Parse UTM parameters from URL
export const parseUTMParams = (url: string): {
  source?: string;
  medium?: string;
  campaign?: string;
} => {
  try {
    const urlObj = new URL(url);
    return {
      source: urlObj.searchParams.get('utm_source') || undefined,
      medium: urlObj.searchParams.get('utm_medium') || undefined,
      campaign: urlObj.searchParams.get('utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
};

// Generate QR code URL with tracking
export const generateQRCodeUrl = (baseUrl: string, eventId: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', 'qr_code');
  url.searchParams.set('utm_medium', 'qr');
  url.searchParams.set('utm_campaign', 'event_signup');
  return url.toString();
};

// Generate shareable link with tracking
export const generateShareableLink = (
  baseUrl: string,
  eventId: string,
  source: string = 'direct',
  medium: string = 'link',
  campaign?: string
): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  if (campaign) {
    url.searchParams.set('utm_campaign', campaign);
  }
  return url.toString();
};





















