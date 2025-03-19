
import React, { useRef } from "react";
import CallTranscript from "../CallAnalysis/CallTranscript";
import SentimentAnalysis from "../CallAnalysis/SentimentAnalysis";
import KeywordInsights from "../CallAnalysis/KeywordInsights";
import CallRating from "../CallAnalysis/CallRating";
import ContentLoader from "../ui/ContentLoader";
import { useContext } from "react";
import { ThemeContext } from "@/App";
import { BarChart2, BookText, LineChart } from "lucide-react";

interface CallAnalysisSectionProps {
  isLoading: boolean;
}

const CallAnalysisSection = ({ isLoading }: CallAnalysisSectionProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const callAnalysisSectionRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className={`mb-4 ${isDarkMode ? 'bg-dark-purple/30' : 'bg-slate-50'} rounded-xl p-4 border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
      <h2 
        ref={callAnalysisSectionRef}
        className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-3 flex items-center`}
      >
        <BarChart2 className="h-5 w-5 mr-2 text-neon-purple" />
        Call Analysis
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Call Transcript - Takes 7/12 of the space on md screens */}
        <div className="col-span-1 md:col-span-7">
          <div className="bg-card rounded-lg overflow-hidden h-full min-h-[250px]">
            <ContentLoader 
              isLoading={isLoading} 
              height={250}
              skeletonCount={1}
              preserveHeight={true}
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <div className="flex items-center">
                    <BookText className="h-4 w-4 mr-2 text-neon-blue" />
                    <h3 className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Call Transcript
                    </h3>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[250px]">
                  <CallTranscript />
                </div>
              </div>
            </ContentLoader>
          </div>
        </div>
        
        {/* Analysis Widgets - Takes 5/12 of the space on md screens */}
        <div className="col-span-1 md:col-span-5 grid grid-rows-3 gap-2">
          {/* Sentiment Analysis */}
          <div className="bg-card rounded-lg overflow-hidden">
            <ContentLoader 
              isLoading={isLoading} 
              height={80}
              skeletonCount={1}
              preserveHeight={true}
            >
              <div className="h-full">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <div className="flex items-center">
                    <LineChart className="h-4 w-4 mr-2 text-neon-pink" />
                    <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Sentiment Analysis
                    </h3>
                  </div>
                </div>
                <div className="p-2">
                  <SentimentAnalysis />
                </div>
              </div>
            </ContentLoader>
          </div>
          
          {/* Keyword Insights */}
          <div className="bg-card rounded-lg overflow-hidden">
            <ContentLoader 
              isLoading={isLoading} 
              height={80}
              skeletonCount={1}
              preserveHeight={true}
            >
              <div className="h-full">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <div className="flex items-center">
                    <BarChart2 className="h-4 w-4 mr-2 text-neon-green" />
                    <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Keyword Insights
                    </h3>
                  </div>
                </div>
                <div className="p-2">
                  <KeywordInsights />
                </div>
              </div>
            </ContentLoader>
          </div>
          
          {/* Call Rating */}
          <div className="bg-card rounded-lg overflow-hidden">
            <ContentLoader 
              isLoading={isLoading} 
              height={80}
              skeletonCount={1}
              preserveHeight={true}
            >
              <div className="h-full">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <div className="flex items-center">
                    <BarChart2 className="h-4 w-4 mr-2 text-neon-blue" />
                    <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Call Rating
                    </h3>
                  </div>
                </div>
                <div className="p-2">
                  <CallRating />
                </div>
              </div>
            </ContentLoader>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallAnalysisSection;
