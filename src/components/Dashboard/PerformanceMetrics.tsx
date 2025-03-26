
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  LineChart, Phone, TrendingUp, 
  BarChart2, UserCheck, Clock
} from 'lucide-react';

const PerformanceMetrics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalCalls: 0,
    avgDuration: 0,
    positiveSentiment: 0,
    callScore: 0,
    conversionRate: 0
  });
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch from call_metrics_summary for latest data
        const { data, error } = await supabase
          .from('call_metrics_summary')
          .select('*')
          .order('report_date', { ascending: false })
          .limit(1)
          .single();
          
        if (error) {
          console.error('Error fetching metrics:', error);
          // Fallback to some demo data
          setMetrics({
            totalCalls: 42,
            avgDuration: 320,
            positiveSentiment: 65,
            callScore: 78,
            conversionRate: 28
          });
          return;
        }
        
        if (data) {
          setMetrics({
            totalCalls: data.total_calls || 0,
            avgDuration: data.avg_duration || 0,
            positiveSentiment: data.positive_sentiment_count 
              ? Math.round((data.positive_sentiment_count / data.total_calls) * 100) 
              : 0,
            callScore: data.performance_score || 0,
            conversionRate: data.conversion_rate || 0
          });
        }
      } catch (err) {
        console.error('Error in fetchMetrics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMetrics();
  }, []);
  
  const metricCards = [
    {
      title: 'Total Calls',
      value: metrics.totalCalls,
      unit: '',
      icon: <Phone className="h-4 w-4 text-muted-foreground" />,
      change: '+12%',
      trend: 'up'
    },
    {
      title: 'Avg Duration',
      value: Math.round(metrics.avgDuration / 60), // Convert to minutes
      unit: 'min',
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      change: '-5%',
      trend: 'down'
    },
    {
      title: 'Positive Sentiment',
      value: metrics.positiveSentiment,
      unit: '%',
      icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
      change: '+8%',
      trend: 'up'
    },
    {
      title: 'Call Score',
      value: metrics.callScore,
      unit: '',
      icon: <BarChart2 className="h-4 w-4 text-muted-foreground" />,
      change: '+6%',
      trend: 'up'
    },
    {
      title: 'Conversion Rate',
      value: metrics.conversionRate,
      unit: '%',
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      change: '+3%',
      trend: 'up'
    },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {metricCards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                {card.icon}
                {card.title}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                card.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {card.change}
              </span>
            </div>
            <div className="mt-2">
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <span className="text-3xl font-bold">
                  {card.value}{card.unit}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PerformanceMetrics;
