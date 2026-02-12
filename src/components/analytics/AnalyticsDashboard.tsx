import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, RefreshCw, Download, BarChart3, Users, MousePointer, QrCode, Eye, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAnalyticsDashboard } from '@/hooks/useAnalytics';
import { AnalyticsFilters } from '@/utils/analyticsUtils';

interface AnalyticsDashboardProps {
  eventId: string;
  eventTitle?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ eventId, eventTitle }) => {
  const {
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
    refresh,
  } = useAnalyticsDashboard(eventId);

  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<AnalyticsFilters>(filters);

  const filterOptions = getFilterOptions();

  const handleApplyFilters = () => {
    applyFilters(tempFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    clearFilters();
    setTempFilters({});
    setShowFilters(false);
  };

  const exportData = () => {
    if (!filteredData.length) return;

    const csvContent = [
      ['Date', 'Type', 'Device', 'Country', 'Clicks', 'Unique Visitors'].join(','),
      ...filteredData.map(row => [
        row.date_group,
        row.tracking_type,
        row.device_type || 'Unknown',
        row.country || 'Unknown',
        row.click_count,
        row.unique_visitors,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${eventTitle || 'event'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'total_clicks':
        return <MousePointer className="w-5 h-5 text-blue-600" />;
      case 'qr_scans':
        return <QrCode className="w-5 h-5 text-emerald-400" />;
      case 'human_clicks':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'unique_clicks':
        return <TrendingUp className="w-5 h-5 text-orange-600" />;
      case 'visitors':
        return <Eye className="w-5 h-5 text-indigo-600" />;
      case 'page_views':
        return <BarChart3 className="w-5 h-5 text-red-400" />;
      default:
        return <BarChart3 className="w-5 h-5 text-white/50" />;
    }
  };

  const getMetricLabel = (type: string) => {
    switch (type) {
      case 'total_clicks':
        return 'Total Clicks';
      case 'qr_scans':
        return 'QR Scans';
      case 'human_clicks':
        return 'Human Clicks';
      case 'unique_clicks':
        return 'Unique Clicks';
      case 'visitors':
        return 'Visitors';
      case 'page_views':
        return 'Page Views';
      default:
        return type;
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            <p>Error loading analytics: {error}</p>
            <Button onClick={refresh} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          {eventTitle && (
            <p className="text-white/50 mt-1">{eventTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={exportData}
            disabled={!filteredData.length}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "PPP") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => {
                          if (date) {
                            applyDateRange(date, dateRange.to);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "PPP") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => {
                          if (date) {
                            applyDateRange(dateRange.from, date);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Tracking Types */}
              <div className="space-y-2">
                <Label>Tracking Types</Label>
                <Select
                  value={tempFilters.trackingTypes?.[0] || ''}
                  onValueChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      trackingTypes: value ? [value] : undefined,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {filterOptions.trackingTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getMetricLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Device Types */}
              <div className="space-y-2">
                <Label>Device Types</Label>
                <Select
                  value={tempFilters.deviceTypes?.[0] || ''}
                  onValueChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      deviceTypes: value ? [value] : undefined,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All devices</SelectItem>
                    {filterOptions.deviceTypes.map((device) => (
                      <SelectItem key={device} value={device}>
                        {device}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Countries */}
              <div className="space-y-2">
                <Label>Countries</Label>
                <Select
                  value={tempFilters.countries?.[0] || ''}
                  onValueChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      countries: value ? [value] : undefined,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All countries</SelectItem>
                    {filterOptions.countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
              <Button onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {Object.entries(summary).map(([key, value]) => (
            <Card key={key} className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="p-2 bg-background rounded-lg">
                    {getMetricIcon(key)}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-sm text-white/50">{getMetricLabel(key)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Data Table */}
      {filteredData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Type</th>
                    <th className="text-left p-2 font-medium">Device</th>
                    <th className="text-left p-2 font-medium">Country</th>
                    <th className="text-right p-2 font-medium">Clicks</th>
                    <th className="text-right p-2 font-medium">Unique Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-background">
                      <td className="p-2">{row.date_group}</td>
                      <td className="p-2">
                        <Badge variant="outline">
                          {getMetricLabel(row.tracking_type)}
                        </Badge>
                      </td>
                      <td className="p-2">{row.device_type || 'Unknown'}</td>
                      <td className="p-2">{row.country || 'Unknown'}</td>
                      <td className="p-2 text-right font-medium">{row.click_count}</td>
                      <td className="p-2 text-right font-medium">{row.unique_visitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredData.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-white/40">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <p>No analytics data available for the selected filters.</p>
              <p className="text-sm mt-2">Try adjusting your filters or check back later.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-white/30" />
              <p className="text-white/50">Loading analytics data...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboard;





















