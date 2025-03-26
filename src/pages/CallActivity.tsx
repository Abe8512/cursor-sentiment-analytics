import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallMetricsStore } from "@/store/useCallMetricsStore";
import { useRealTimeTeamMetrics, useRealTimeRepMetrics } from "@/services/RealTimeMetricsService";
import DateRangeFilter from "@/components/CallAnalysis/DateRangeFilter";
import TeamFilterWrapper from "@/components/Performance/TeamFilterWrapper";
import CoachingAlerts from "@/components/CallAnalysis/CoachingAlerts";
import KeywordInsights from "@/components/CallAnalysis/KeywordInsights";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCallTranscripts, CallTranscriptFilter } from "@/services/CallTranscriptService";
import { useEventListener } from '@/services/events';
import { toast } from "sonner";
import TeamPerformanceOverview from "@/components/CallActivity/TeamPerformanceOverview";
import RepPerformanceCards from "@/components/CallActivity/RepPerformanceCards";
import RecentCallsTable from "@/components/CallActivity/RecentCallsTable";
import CallOutcomeStats from "@/components/CallActivity/CallOutcomeStats";
import { getMetrics, getCallDistributionData } from "@/services/CallTranscriptMetricsService";

interface Call {
  id: string;
  userId: string;
  userName: string;
  date: string;
  duration: number;
  customerName: string;
  outcome: string;
  sentiment: number;
  nextSteps: string;
}

const CallActivity = () => {
  const { user, isAdmin, isManager, getManagedUsers } = useAuth();
  const { isRecording } = useCallMetricsStore();
  
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filters, setFilters] = useState({
    teamMembers: [] as string[],
    productLines: [] as string[],
    callTypes: [] as string[],
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewType, setViewType] = useState('rep');
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  
  const [teamMetrics, teamMetricsLoading] = useRealTimeTeamMetrics();
  const [repMetrics, repMetricsLoading] = useRealTimeRepMetrics(
    filters.teamMembers.length > 0 ? filters.teamMembers : undefined
  );
  
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { 
    transcripts, 
    loading: transcriptsLoading, 
    fetchTranscripts
  } = useCallTranscripts();
  
  const fetchCallData = useCallback(async () => {
    setLoading(true);
    try {
      const filter: CallTranscriptFilter = {
        dateRange: {
          from: dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: dateRange?.to || new Date()
        }
      };
      
      if (viewType === 'team' && selectedReps.length > 0) {
        filter.userIds = selectedReps;
      } else if (selectedRep) {
        filter.userId = selectedRep;
      }
      
      await fetchTranscripts(filter);
    } catch (error) {
      console.error('Error fetching call activity:', error);
      toast({
        title: 'Error loading call data',
        description: 'Could not load call activity data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, fetchTranscripts, selectedRep, selectedReps, viewType, toast]);
  
  const getTeamMemberName = useCallback((call: CallTranscript) => {
    if (!call.user_id) return 'Unassigned';
    
    const member = teamMembers.find((m) => m.user_id === call.user_id);
    return member ? member.name : 'Unknown';
  }, [teamMembers]);
  
  const refreshData = useCallback(() => {
    fetchCallData();
    setRefreshTrigger(prev => prev + 1);
  }, [fetchCallData]);
  
  useEventListener('bulk-upload-completed' as any, (data) => {
    console.log('Bulk upload completed event received', data);
    toast.success(`${data?.count || 'Multiple'} files processed`, {
      description: "Refreshing call data..."
    });
    refreshData();
  });
  
  useEventListener('recording-completed' as any, (data) => {
    console.log('Recording completed event received', data);
    toast.success('New recording added', {
      description: "Refreshing call data..."
    });
    refreshData();
  });
  
  useEventListener('transcripts-refreshed' as any, () => {
    console.log('Transcripts refreshed event received');
    refreshData();
  });
  
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  useEffect(() => {
    if (transcripts.length > 0) {
      const convertedCalls: Call[] = transcripts.map(transcript => {
        const filenameBase = transcript.filename?.split('.')[0] || '';
        const customerName = filenameBase.includes('_') 
          ? filenameBase.split('_')[1] 
          : `Customer ${transcript.id.substring(0, 5)}`;
        
        const outcome = transcript.sentiment === 'positive' ? "Qualified Lead" : 
                      transcript.sentiment === 'negative' ? "No Interest" : "Follow-up Required";
        
        const sentimentValue = transcript.sentiment === 'positive' ? 0.8 : 
                              transcript.sentiment === 'negative' ? 0.3 : 0.6;
        
        const nextSteps = outcome === "Qualified Lead" ? "Schedule demo" : 
                        outcome === "No Interest" ? "No action required" : "Send additional information";
        
        return {
          id: transcript.id,
          userId: transcript.user_id || user?.id || "unknown",
          userName: getManagedUsers().find(u => u.id === transcript.user_id)?.name || user?.name || "Current User",
          date: transcript.created_at || new Date().toISOString(),
          duration: transcript.duration || 0,
          customerName,
          outcome,
          sentiment: sentimentValue,
          nextSteps
        };
      });
      
      setCalls(convertedCalls);
    } else {
      setCalls([]);
    }
  }, [transcripts, user, getManagedUsers, refreshTrigger]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const getFormattedMetrics = () => {
    const rawMetrics = getMetrics(transcripts);
    return rawMetrics.outcomeStats.filter(outcome => outcome.outcome !== 'Total');
  };

  const getFormattedDistributionData = () => {
    const rawData = getCallDistributionData(transcripts);
    return rawData.map(item => ({
      name: item.name,
      calls: item.calls
    }));
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2">Call Activity</h1>
        <p className="text-muted-foreground">
          {isAdmin || isManager 
            ? "Monitor and analyze sales call activities across your team" 
            : "Monitor and analyze your sales call activities"}
        </p>
      </div>
      
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <DateRangeFilter dateRange={dateRange} setDateRange={setDateRange} />
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDateRange(undefined)}
              disabled={!dateRange}
            >
              Clear Dates
            </Button>
          </div>
        </div>
        
        {(isAdmin || isManager) && (
          <TeamFilterWrapper onFilterChange={handleFilterChange} />
        )}
      </div>
      
      <TeamPerformanceOverview 
        teamMetrics={teamMetrics} 
        teamMetricsLoading={teamMetricsLoading || transcriptsLoading}
        callsLength={calls.length}
      />
      
      {(isAdmin || isManager) && (
        <RepPerformanceCards 
          repMetrics={repMetrics} 
          repMetricsLoading={repMetricsLoading} 
        />
      )}
      
      <Tabs defaultValue="calls" className="mb-6">
        <TabsList>
          <TabsTrigger value="calls">Calls List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calls" className="mt-6">
          <RecentCallsTable 
            calls={calls} 
            isAdmin={isAdmin} 
            isManager={isManager}
            loading={transcriptsLoading}
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <CallOutcomeStats 
            outcomeStats={getFormattedMetrics()} 
            callDistributionData={getFormattedDistributionData()} 
          />
        </TabsContent>
        
        <TabsContent value="outcomes" className="mt-6">
          <CallOutcomeStats 
            outcomeStats={getFormattedMetrics()} 
            callDistributionData={getFormattedDistributionData()} 
          />
        </TabsContent>
        
        <TabsContent value="keywords" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Insights</CardTitle>
              <CardDescription>Keywords categorized by sentiment</CardDescription>
            </CardHeader>
            <CardContent>
              <KeywordInsights />
              {!isRecording && (
                <p className="text-center text-muted-foreground mt-4">
                  Start a recording to see real-time keyword insights
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <CoachingAlerts />
    </DashboardLayout>
  );
};

export default CallActivity;
