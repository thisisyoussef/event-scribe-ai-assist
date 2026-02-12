import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AnalyticsSummary,
  AnalyticsFilteredData,
  AnalyticsFilters,
  trackPageView,
  trackLinkClick,
  trackQRScan,
  trackHumanClick,
  getAnalyticsSummary,
  getFilteredAnalytics,
  parseUTMParams,
} from '@/utils/analyticsUtils';

export const useAnalytics = (eventId?: string) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [filteredData, setFilteredData] = useState<AnalyticsFilteredData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load analytics summary
  const loadSummary = useCallback(async (filters?: {
    dateFrom?: string;
    dateTo?: string;
    trackingType?: string;
  }) => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getAnalyticsSummary(eventId, filters);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Load filtered analytics data
  const loadFilteredData = useCallback(async (filters: AnalyticsFilters) => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getFilteredAnalytics(eventId, filters);
      setFilteredData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filtered analytics');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Auto-track page view when component mounts
  useEffect(() => {
    if (eventId) {
      trackPageView(eventId);
    }
  }, [eventId]);

  // Track different types of interactions
  const trackInteraction = useCallback(async (
    type: 'link_click' | 'qr_scan' | 'human_click',
    utmParams?: { source?: string; medium?: string; campaign?: string }
  ) => {
    if (!eventId) return false;

    try {
      switch (type) {
        case 'link_click':
          return await trackLinkClick(eventId, utmParams);
        case 'qr_scan':
          return await trackQRScan(eventId);
        case 'human_click':
          return await trackHumanClick(eventId);
        default:
          return false;
      }
    } catch (err) {
      console.error('Error tracking interaction:', err);
      return false;
    }
  }, [eventId]);

  // Track link click with automatic UTM parsing
  const trackLinkClickWithUTM = useCallback(async (url: string) => {
    if (!eventId) return false;

    const utmParams = parseUTMParams(url);
    return await trackInteraction('link_click', utmParams);
  }, [eventId, trackInteraction]);

  // Refresh data
  const refresh = useCallback(() => {
    if (eventId) {
      loadSummary();
    }
  }, [eventId, loadSummary]);

  return {
    summary,
    filteredData,
    loading,
    error,
    loadSummary,
    loadFilteredData,
    trackInteraction,
    trackLinkClickWithUTM,
    refresh,
  };
};

// Hook for analytics dashboard
export const useAnalyticsDashboard = (eventId: string) => {
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  
  const {
    summary,
    filteredData,
    loading,
    error,
    loadSummary,
    loadFilteredData,
  } = useAnalytics(eventId);

  // Apply filters
  const applyFilters = useCallback((newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
    loadFilteredData(newFilters);
  }, [loadFilteredData]);

  // Apply date range
  const applyDateRange = useCallback((from?: Date, to?: Date) => {
    setDateRange({ from, to });
    
    const newFilters: AnalyticsFilters = {
      ...filters,
      dateFrom: from?.toISOString(),
      dateTo: to?.toISOString(),
    };
    
    applyFilters(newFilters);
  }, [filters, applyFilters]);

  // Load summary with current filters
  useEffect(() => {
    const summaryFilters = {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      trackingType: filters.trackingTypes?.[0], // Use first tracking type for summary
    };
    
    loadSummary(summaryFilters);
  }, [filters, loadSummary]);

  // Get available filter options
  const getFilterOptions = useCallback(() => {
    const trackingTypes = Array.from(new Set(filteredData.map(d => d.tracking_type)));
    const deviceTypes = Array.from(new Set(filteredData.map(d => d.device_type).filter(Boolean)));
    const countries = Array.from(new Set(filteredData.map(d => d.country).filter(Boolean)));

    return {
      trackingTypes,
      deviceTypes,
      countries,
    };
  }, [filteredData]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setDateRange({});
    loadSummary();
    loadFilteredData({});
  }, [loadSummary, loadFilteredData]);

  return {
    summary,
    filteredData,
    loading,
    error,
    filters,
    dateRange,
    applyFilters,
    applyDateRange,
    clearFilters,
    getFilterOptions,
    refresh: () => {
      loadSummary();
      loadFilteredData(filters);
    },
  };
};





















