
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Expand, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface ExpandableChartProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  className?: string;
  lastUpdated?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const ExpandableChart = ({ 
  title, 
  subtitle, 
  children, 
  expandedContent, 
  className,
  lastUpdated,
  isLoading = false,
  onRefresh 
}: ExpandableChartProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      toast({
        title: "Refreshing data",
        description: "This will connect to the backend API when implemented",
      });
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80"
          onClick={() => setIsExpanded(true)}
        >
          <Expand className="h-3.5 w-3.5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {children}

      {lastUpdated && (
        <div className="mt-2 text-xs text-muted-foreground text-right">
          Last updated: {lastUpdated}
        </div>
      )}

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </DialogHeader>
          
          <div className="py-4">
            {expandedContent || children}
          </div>
          
          {lastUpdated && (
            <div className="text-xs text-muted-foreground text-right">
              Last updated: {lastUpdated}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpandableChart;
