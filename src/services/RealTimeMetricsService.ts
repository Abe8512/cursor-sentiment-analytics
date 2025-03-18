
import { useEffect, useMemo, useCallback } from "react";
import {
  useSharedTeamMetrics,
  useSharedRepMetrics,
  type TeamMetricsData as TeamMetrics,
  type RepMetricsData as RepMetrics,
  type DataFilters
} from "./SharedDataService";
import { validateMetricConsistency } from "@/utils/metricCalculations";
import { animationUtils } from "@/utils/animationUtils";
import { useStableLoadingState } from "@/hooks/useStableLoadingState";
import { errorHandler, withErrorHandling } from "./ErrorHandlingService";

// Re-export TeamMetrics and RepMetrics for backward compatibility
export type { TeamMetrics, RepMetrics };

/**
 * Optimized hook for real-time team metrics with improved performance
 */
export const useRealTimeTeamMetrics = (filters?: DataFilters): [TeamMetrics, boolean] => {
  const { metrics, isLoading, error } = useSharedTeamMetrics(filters);
  const stableLoading = useStableLoadingState(isLoading, 400);
  
  // Stabilize metrics with memoization to prevent UI jitter
  const stableMetrics = useMemo(() => {
    if (!metrics) {
      return {
        performanceScore: 0,
        totalCalls: 0,
        conversionRate: 0,
        avgCallDuration: 0,
        avgSentiment: 0,
        topKeywords: [],
        avgTalkRatio: { agent: 50, customer: 50 },
        callOutcomes: { successful: 0, unsuccessful: 0 }
      } as TeamMetrics;
    }
    
    return {
      ...metrics,
      // Round percentage values to prevent small fluctuations
      performanceScore: Math.round(metrics.performanceScore),
      conversionRate: Math.round(metrics.conversionRate * 10) / 10,
      // Ensure talk ratio always adds up to 100%
      avgTalkRatio: {
        agent: Math.round(metrics.avgTalkRatio.agent),
        customer: 100 - Math.round(metrics.avgTalkRatio.agent)
      }
    };
  }, [metrics]);
  
  // Add data validation in development mode
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && metrics) {
      // Throttle validation to improve performance
      const throttledValidation = animationUtils.throttle(() => {
        validateMetricConsistency('Performance Score', [metrics.performanceScore]);
        validateMetricConsistency('Conversion Rate', [metrics.conversionRate]);
      }, 2000);
      
      // Only call throttledValidation if it's not null
      if (throttledValidation) {
        throttledValidation();
        
        return () => {
          throttledValidation.cancel();
        };
      }
    }
  }, [metrics]);
  
  // Log errors for monitoring but don't impact the UI
  useEffect(() => {
    if (error) {
      errorHandler.handleError({
        message: "Couldn't load team metrics",
        technical: error instanceof Error ? error.message : String(error),
        severity: "warning",
        code: "TEAM_METRICS_ERROR"
      }, "TeamMetrics");
    }
  }, [error]);
  
  return [stableMetrics, stableLoading];
};

/**
 * Optimized hook for real-time rep metrics with improved performance
 */
export const useRealTimeRepMetrics = (repIds?: string[]): [RepMetrics[], boolean] => {
  const filters: DataFilters = useMemo(() => 
    repIds ? { repIds } : {}, [repIds]
  );
  
  // Modified this part to ensure proper typing
  const repMetricsResponse = useSharedRepMetrics(filters);
  const { metrics, isLoading } = repMetricsResponse;
  // Access the error property safely
  const error = 'error' in repMetricsResponse ? repMetricsResponse.error : undefined;
  
  const stableLoading = useStableLoadingState(isLoading, 400);
  
  // Stabilize rep metrics data with memoization
  const stableMetrics = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    
    return metrics.map(rep => ({
      ...rep,
      // Round percentage values for stability
      successRate: Math.round(rep.successRate),
      sentiment: Math.round(rep.sentiment * 100) / 100
    }));
  }, [metrics]);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      errorHandler.handleError({
        message: "Couldn't load rep metrics",
        technical: typeof error === 'object' ? String(error) : error,
        severity: "warning",
        code: "REP_METRICS_ERROR"
      }, "RepMetrics");
    }
  }, [error]);
  
  return [stableMetrics, stableLoading];
};
