
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fixCallSentiments } from '@/utils/fixCallSentiments';
import { MetricsData, initialMetricsData } from '@/types/metrics';

interface MetricsContextType {
  metrics: MetricsData;
  refreshMetrics: () => Promise<void>;
  fixNeutralSentiments: () => Promise<void>;
  isUpdating: boolean;
}

const MetricsContext = createContext<MetricsContextType>({
  metrics: initialMetricsData,
  refreshMetrics: async () => {},
  fixNeutralSentiments: async () => {},
  isUpdating: false
});

/**
 * Hook to access metrics data and functions
 * @returns Metrics context with data and update functions
 */
export const useMetrics = () => useContext(MetricsContext);

/**
 * Provider component that fetches and maintains real-time metrics data
 * Makes metrics data available throughout the application
 */
export const RealTimeMetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<MetricsData>(initialMetricsData);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  /**
   * Fetches the latest metrics data from the database
   */
  const fetchMetrics = async () => {
    try {
      console.log('Fetching real-time metrics from Supabase...');
      setMetrics(prev => ({ ...prev, isLoading: true, lastError: null }));
      
      const { data, error } = await supabase
        .from('call_metrics_summary')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching metrics:', error);
        setMetrics(prev => ({ 
          ...prev, 
          isLoading: false, 
          isUsingDemoData: true,
          lastError: error.message
        }));
        return;
      }
      
      if (data && data.length > 0) {
        console.log('Successfully retrieved metrics:', data[0]);
        const metricsData = data[0];
        
        const totalSentiment = 
          (metricsData.positive_sentiment_count || 0) + 
          (metricsData.negative_sentiment_count || 0) + 
          (metricsData.neutral_sentiment_count || 0);
            
        // Calculate sentiment percentages
        const positiveSentiment = totalSentiment > 0 
          ? ((metricsData.positive_sentiment_count || 0) / totalSentiment) * 100
          : 0;
            
        const negativeSentiment = totalSentiment > 0 
          ? ((metricsData.negative_sentiment_count || 0) / totalSentiment) * 100
          : 0;
            
        const neutralSentiment = totalSentiment > 0 
          ? ((metricsData.neutral_sentiment_count || 0) / totalSentiment) * 100
          : 0;
        
        setMetrics({
          totalCalls: metricsData.total_calls || 0,
          avgDuration: metricsData.avg_duration || 0,
          positiveSentiment,
          negativeSentiment,
          neutralSentiment,
          avgSentiment: metricsData.avg_sentiment || 0.5,
          callScore: metricsData.performance_score || 0,
          conversionRate: metricsData.conversion_rate ? metricsData.conversion_rate * 100 : 0,
          agentTalkRatio: metricsData.agent_talk_ratio || 50,
          customerTalkRatio: metricsData.customer_talk_ratio || 50,
          topKeywords: metricsData.top_keywords || [],
          reportDate: metricsData.report_date,
          lastUpdated: new Date(),
          isLoading: false,
          isUsingDemoData: false,
          lastError: null
        });
      } else {
        console.log('No metrics data found, using default/demo values');
        setMetrics(prev => ({ 
          ...prev, 
          isLoading: false, 
          isUsingDemoData: true,
          lastError: 'No metrics data found'
        }));
      }
    } catch (error) {
      console.error('Exception in fetchMetrics:', error);
      setMetrics(prev => ({ 
        ...prev, 
        isLoading: false, 
        isUsingDemoData: true,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };
  
  /**
   * Refreshes metrics data and shows a toast notification
   */
  const refreshMetrics = async () => {
    await fetchMetrics();
    toast({
      title: "Metrics Refreshed",
      description: "Latest metrics data has been loaded"
    });
  };
  
  /**
   * Fixes neutral sentiment values and refreshes metrics
   */
  const fixNeutralSentiments = async () => {
    setIsUpdating(true);
    
    try {
      const result = await fixCallSentiments();
      
      if (result.success) {
        toast({
          title: "Sentiment Update Complete",
          description: `Updated ${result.updated} of ${result.total} calls. Failed: ${result.failed}`,
          variant: result.failed > 0 ? "destructive" : "default"
        });
        
        // Refresh metrics after updating sentiments
        await fetchMetrics();
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "Could not update sentiments",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Error fixing sentiments:', err);
      toast({
        title: "Error",
        description: "Failed to update call sentiments",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Set up real-time subscription for metrics updates
  useEffect(() => {
    // Initial fetch
    fetchMetrics();
    
    // Subscribe to changes on the call_metrics_summary table
    const subscription = supabase
      .channel('metrics-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'call_metrics_summary' }, 
        () => {
          console.log('Metrics data updated in database, refreshing...');
          fetchMetrics();
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'call_transcripts' },
        () => {
          console.log('Call transcripts updated, refreshing metrics...');
          fetchMetrics();
        })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return (
    <MetricsContext.Provider value={{ metrics, refreshMetrics, fixNeutralSentiments, isUpdating }}>
      {children}
    </MetricsContext.Provider>
  );
};

export default RealTimeMetricsProvider;
