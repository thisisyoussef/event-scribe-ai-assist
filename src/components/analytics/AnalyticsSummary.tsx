import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MousePointer, 
  QrCode, 
  Users, 
  TrendingUp, 
  Eye, 
  BarChart3,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsSummaryProps {
  eventId: string;
  compact?: boolean;
  showRefresh?: boolean;
  onViewDetails?: () => void;
}

const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ 
  eventId, 
  compact = false,
  showRefresh = true,
  onViewDetails 
}) => {
  const { summary, loading, error, refresh } = useAnalytics(eventId);

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'total_clicks':
        return <MousePointer className="w-4 h-4 text-blue-600" />;
      case 'qr_scans':
        return <QrCode className="w-4 h-4 text-green-600" />;
      case 'human_clicks':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'unique_clicks':
        return <TrendingUp className="w-4 h-4 text-orange-600" />;
      case 'visitors':
        return <Eye className="w-4 h-4 text-indigo-600" />;
      case 'page_views':
        return <BarChart3 className="w-4 h-4 text-red-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-600" />;
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
      <Card className={cn(compact && "p-3")}>
        <CardContent className={cn(compact ? "p-0" : "p-4")}>
          <div className="text-center text-red-600">
            <p className="text-sm">Error loading analytics</p>
            {showRefresh && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={refresh} 
                className="mt-2"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={cn(compact && "p-3")}>
        <CardContent className={cn(compact ? "p-0" : "p-4")}>
          <div className="text-center">
            <RefreshCw className="w-4 h-4 mx-auto mb-2 animate-spin text-gray-400" />
            <p className="text-sm text-gray-600">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const metrics = [
    { key: 'total_clicks', value: summary.total_clicks },
    { key: 'qr_scans', value: summary.qr_scans },
    { key: 'human_clicks', value: summary.human_clicks },
    { key: 'unique_clicks', value: summary.unique_clicks },
    { key: 'visitors', value: summary.visitors },
    { key: 'page_views', value: summary.page_views },
  ];

  if (compact) {
    return (
      <Card className="p-3">
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Analytics</h3>
            <div className="flex items-center gap-2">
              {showRefresh && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={refresh}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              )}
              {onViewDetails && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onViewDetails}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {metrics.map(({ key, value }) => (
              <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <div className="flex-shrink-0">
                  {getMetricIcon(key)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {getMetricLabel(key)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
          <div className="flex items-center gap-2">
            {showRefresh && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={refresh}
                className="flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </Button>
            )}
            {onViewDetails && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onViewDetails}
                className="flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View Details
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map(({ key, value }) => (
            <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                {getMetricIcon(key)}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-600">{getMetricLabel(key)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsSummary;





















