
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CalendarDays,
  Newspaper, // Kept for news modal, but card removed from main grid
  ShieldAlert,
  ListChecks,
  Edit3, // For New Assessment button
  FileText, // For Report Incident button
  ExternalLink,
  Info, // Kept for news modal details
  Activity,
  TrendingUp,
  Filter,
  AlertCircle,
  Loader2,
  ListOrdered, // For View All Tasks button
  Radiation, // For Initiate Lockdown
  MessageSquare, // For Send Alert
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import {
  getAssignmentListMetadata,
  getAssignmentById,
  type AssignmentMetadata,
  type AssignmentWithPermissions,
} from "@/services/assignmentFunctionsService";
import {
  getDashboardWidgetsSandbox,
  getCommonResponsesForAssignment,
} from "@/services/analysisService";
import type {
  WidgetSandboxData,
  SchoolsWithQuestionsResponse,
  UserActivity,
  AssignmentCompletionStatus,
} from "@/types/Analysis";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { formatDisplayDateShort } from "@/lib/utils";
import Link from "next/link"; // For "New Assessment" button

const GOOGLE_NEWS_RSS_URL =
  "https://news.google.com/rss/search?q=K-12+school+security+OR+school+cybersecurity&hl=en-US&gl=US&ceid=US:en";
const RSS2JSON_API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
  GOOGLE_NEWS_RSS_URL
)}`;

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  description: string;
  guid: string;
  thumbnail?: string;
}

interface RssResponse {
  status: string;
  feed: object;
  items: NewsItem[];
}

const PERIOD_OPTIONS = [
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "last90days", label: "Last 90 Days" },
  { value: "alltime", label: "All Time" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeInOut",
    },
  }),
};

const heroContainerVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.7,
      ease: "easeInOut",
      when: "beforeChildren",
      staggerChildren: 0.2,
    },
  },
};

const heroTextVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

// --- New Placeholder Card Components ---
const CriticalTasksCard: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <AlertTriangle className="h-5 w-5 text-destructive" /> Critical Tasks
      </CardTitle>
      <CardDescription>High-priority items needing immediate attention.</CardDescription>
    </CardHeader>
    <CardContent>
      <ul className="space-y-3 text-sm">
        <li className="flex justify-between items-center"><span>Inspect broken fence near West Gate</span> <Button variant="link" size="sm" className="p-0 h-auto">Details</Button></li>
        <li className="flex justify-between items-center"><span>Review fire drill report</span> <Button variant="link" size="sm" className="p-0 h-auto">Details</Button></li>
        <li className="flex justify-between items-center"><span>Restock first-aid kit - Gym</span> <Button variant="link" size="sm" className="p-0 h-auto">Details</Button></li>
      </ul>
    </CardContent>
  </Card>
);

const UpcomingEventsCard: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <CalendarDays className="h-5 w-5 text-primary" /> Upcoming Events & Drills
      </CardTitle>
      <CardDescription>Scheduled safety events and drills.</CardDescription>
    </CardHeader>
    <CardContent>
      <ul className="space-y-2 text-sm">
        <li><strong>Campus Safety Workshop:</strong> Tomorrow, 10 AM</li>
        <li><strong>Fire Drill (Block B):</strong> Oct 28, 2 PM</li>
        <li><strong>Security Team Meeting:</strong> Nov 2, 9 AM</li>
      </ul>
    </CardContent>
  </Card>
);

const EmergencyProtocolsCard: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <ShieldAlert className="h-5 w-5 text-primary" /> Emergency Protocols
      </CardTitle>
      <CardDescription>Quick actions for emergency situations.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <Button className="w-full bg-destructive hover:bg-destructive/90">
        <Radiation className="mr-2 h-4 w-4" /> Initiate Lockdown
      </Button>
      <Button variant="outline" className="w-full">
        <FileText className="mr-2 h-4 w-4" /> Report Incident
      </Button>
      <Button variant="outline" className="w-full">
        <MessageSquare className="mr-2 h-4 w-4" /> Send Alert
      </Button>
    </CardContent>
  </Card>
);


export default function DashboardPage() {
  const { userProfile, loading: authLoading, profileLoading } = useAuth();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);

  const [widgetData, setWidgetData] = useState<WidgetSandboxData | null>(null);
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(true);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  const [assignmentsForCommonResponses, setAssignmentsForCommonResponses] = useState<AssignmentMetadata[]>([]);
  const [selectedAssignmentForCommon, setSelectedAssignmentForCommon] = useState<string | null>(null);
  const [commonResponsesAssignmentDetails, setCommonResponsesAssignmentDetails] = useState<AssignmentWithPermissions | null>(null);
  const [isLoadingCommonResponsesAssignmentDetails, setIsLoadingCommonResponsesAssignmentDetails] = useState(false);
  const [commonResponsesData, setCommonResponsesData] = useState<SchoolsWithQuestionsResponse | null>(null);
  const [isLoadingCommonResponses, setIsLoadingCommonResponses] = useState(false);
  const [commonResponsesError, setCommonResponsesError] = useState<string | null>(null);
  const [commonResponsesPeriod, setCommonResponsesPeriod] = useState("last30days");

  const isAdmin = !profileLoading && userProfile && (userProfile.permission === 'admin' || userProfile.permission === 'superAdmin');

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    const fetchNewsData = async () => {
      setNewsLoading(true);
      setNewsError(null);
      try {
        const response = await fetch(RSS2JSON_API_URL);
        if (!response.ok) throw new Error(`Failed to fetch news: ${response.statusText}`);
        const data: RssResponse = await response.json();
        if (data.status === "ok") setNewsItems(data.items.slice(0, 5));
        else throw new Error("News feed API returned an error.");
      } catch (err) {
        setNewsError(err instanceof Error ? err.message : "Failed to fetch news.");
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNewsData();
  }, []);

  useEffect(() => {
    if (userProfile?.account && isClientMounted && !authLoading && !profileLoading) {
      setIsLoadingWidgets(true);
      setWidgetError(null);
      getDashboardWidgetsSandbox(userProfile.account)
        .then(setWidgetData)
        .catch((err) => {
          console.error("Error fetching widget data:", err);
          setWidgetError((err as Error).message || "Could not load dashboard widgets.");
        })
        .finally(() => setIsLoadingWidgets(false));
    }
  }, [userProfile?.account, isClientMounted, authLoading, profileLoading]);

  useEffect(() => {
    if (userProfile?.account && isClientMounted && !authLoading && !profileLoading) {
      getAssignmentListMetadata(userProfile.account)
        .then((data) => {
          setAssignmentsForCommonResponses(data || []);
          if (data && data.length > 0 && !selectedAssignmentForCommon) {
            setSelectedAssignmentForCommon(data[0].id);
          }
        })
        .catch((err) => console.error("Error fetching assignment list:", err));
    }
  }, [userProfile?.account, isClientMounted, authLoading, profileLoading, selectedAssignmentForCommon]);

   useEffect(() => {
    if (userProfile?.account && selectedAssignmentForCommon && isClientMounted && !authLoading && !profileLoading) {
      setIsLoadingCommonResponsesAssignmentDetails(true);
      setCommonResponsesAssignmentDetails(null);
      getAssignmentById(selectedAssignmentForCommon, userProfile.account)
        .then(setCommonResponsesAssignmentDetails)
        .catch((err) => {
          console.error("Error fetching assignment details for common responses:", err);
        })
        .finally(() => setIsLoadingCommonResponsesAssignmentDetails(false));
    }
  }, [userProfile?.account, selectedAssignmentForCommon, isClientMounted, authLoading, profileLoading]);


  useEffect(() => {
    if (
      userProfile?.account &&
      selectedAssignmentForCommon &&
      commonResponsesPeriod &&
      isClientMounted && !authLoading && !profileLoading
    ) {
      setIsLoadingCommonResponses(true);
      setCommonResponsesError(null);
      setCommonResponsesData(null);
      getCommonResponsesForAssignment(
        selectedAssignmentForCommon,
        commonResponsesPeriod,
        userProfile.account
      )
        .then(setCommonResponsesData)
        .catch((err) => {
          console.error("Error fetching common responses:", err);
          setCommonResponsesError((err as Error).message || "Could not load common response data.");
        })
        .finally(() => setIsLoadingCommonResponses(false));
    }
  }, [
    userProfile?.account,
    selectedAssignmentForCommon,
    commonResponsesPeriod,
    isClientMounted,
    authLoading, profileLoading
  ]);

  const renderLastCompletionsWidget = () => {
    if (isLoadingWidgets) return <Skeleton className="h-full w-full min-h-[150px]" />;
    if (widgetError) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{widgetError}</AlertDescription></Alert>;

    const itemsToDisplay = isAdmin ? widgetData?.accountCompletions : widgetData?.userActivity;
    if (!itemsToDisplay || itemsToDisplay.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>;

    return (
      <ScrollArea className="h-48 xl:h-56">
        <ul className="space-y-2 pr-3">
          {itemsToDisplay.map((item: UserActivity | AssignmentCompletionStatus) => (
            <li key={item.id} className="p-3 border rounded-md hover:bg-muted/50">
              <p className="font-medium text-sm truncate">{item.assessmentName}</p>
              {isAdmin && 'totalCompleted' in item ? (
                <p className="text-xs text-muted-foreground">
                  {item.totalCompleted}/{item.totalAssigned} completed. Last: {formatDisplayDateShort(item.lastCompletionDate)}
                </p>
              ) : ('status' in item &&
                <p className="text-xs text-muted-foreground">
                  Status: <span className={`font-semibold ${item.status === 'completed' ? 'text-green-600' : item.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>{item.status}</span>.
                  {item.completedDate ? ` Completed: ${formatDisplayDateShort(item.completedDate)}` : ` Due: ${formatDisplayDateShort(item.dueDate)}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
    );
  };

  const renderStreakWidget = () => (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <TrendingUp className="h-12 w-12 sm:h-16 sm:w-16 text-primary mx-auto mb-2" />
      <p className="text-2xl sm:text-3xl font-bold">Coming Soon</p>
      <p className="text-sm text-muted-foreground mt-1">Track your assignment completion streak. (Backend support needed)</p>
    </div>
  );

  const renderCommonResponsesWidget = () => {
    return (
      <div className="space-y-3 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row gap-2">
           <Select value={selectedAssignmentForCommon || ""} onValueChange={setSelectedAssignmentForCommon} disabled={assignmentsForCommonResponses.length === 0 || isLoadingCommonResponses || isLoadingCommonResponsesAssignmentDetails}>
            <SelectTrigger className="flex-grow min-w-[150px]"><SelectValue placeholder="Select an assignment..." /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Assignments</SelectLabel>
                {assignmentsForCommonResponses.length > 0 ? assignmentsForCommonResponses.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.assessmentName}</SelectItem>
                )) : <SelectItem value="no-assign" disabled>No assignments found</SelectItem>}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={commonResponsesPeriod} onValueChange={setCommonResponsesPeriod} disabled={!selectedAssignmentForCommon || isLoadingCommonResponses || isLoadingCommonResponsesAssignmentDetails}>
            <SelectTrigger className="w-full sm:w-auto min-w-[120px]"><SelectValue placeholder="Select period..." /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {(isLoadingCommonResponses || isLoadingCommonResponsesAssignmentDetails) && <Skeleton className="h-40 w-full flex-grow" />}
        {commonResponsesError && <Alert variant="destructive" className="flex-grow"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{commonResponsesError}</AlertDescription></Alert>}

        {commonResponsesData && commonResponsesAssignmentDetails && !isLoadingCommonResponses && !isLoadingCommonResponsesAssignmentDetails && !commonResponsesError && (
          <ScrollArea className="h-48 xl:h-56 pr-2 flex-grow">
            {Object.keys(commonResponsesData).length > 0 ? (
              Object.entries(commonResponsesData).map(([locationName, questions]) => (
                <div key={locationName} className="mb-3 p-2 border rounded">
                  <h4 className="font-semibold text-xs text-muted-foreground mb-1">{locationName === "undefined" || locationName === "null" ? "Overall / Unspecified Location" : locationName}</h4>
                  {Object.entries(questions).map(([questionId, answerData]) => {
                    const questionDetail = commonResponsesAssignmentDetails.questions.find(q => q.id === questionId);
                    if (questionDetail && questionDetail.component === 'schoolSelector') {
                        return null;
                    }
                    return (
                      <div key={questionId} className="text-xs mb-1 ml-2">
                        <p className="font-medium truncate italic">{answerData.questionLabel || `Q: ${questionId}`}</p>
                        <ul className="list-disc list-inside ml-3 text-muted-foreground/80">
                          {Object.entries(answerData)
                              .filter(([key]) => key !== 'questionLabel')
                              .sort(([, aVal], [, bVal]) => (bVal as number) - (aVal as number))
                              .slice(0, 3)
                              .map(([answer, count]) => (
                                <li key={answer} className="truncate">{answer || "N/A"}: {count}</li>
                           ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ))
            ) : ( <p className="text-sm text-muted-foreground text-center py-4">No common response data found for this selection.</p> )}
          </ScrollArea>
        )}
        {(!selectedAssignmentForCommon || (!commonResponsesData && !isLoadingCommonResponses && !isLoadingCommonResponsesAssignmentDetails)) && !commonResponsesError && (
            <div className="flex-grow flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">{isLoadingCommonResponsesAssignmentDetails || isLoadingCommonResponses ? "Loading data..." : "Select an assignment to view common responses."}</p>
            </div>
        )}
      </div>
    );
  };


  return (
    <div className="space-y-6">
      <motion.div
        variants={heroContainerVariants}
        initial="hidden"
        animate={isClientMounted ? "visible" : "hidden"}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2">
          <div>
            <motion.h1
              variants={heroTextVariants}
              className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
            >
              Welcome to EagleEyED™
            </motion.h1>
            <motion.p variants={heroTextVariants} className="text-base sm:text-lg mt-1 max-w-2xl text-muted-foreground">
              Your central hub for campus safety management.
            </motion.p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Button variant="outline">
              <ListOrdered className="mr-2 h-4 w-4" /> View All Tasks
            </Button>
            <Button asChild>
              <Link href="/assessment-forms/new">
                <Edit3 className="mr-2 h-4 w-4" /> New Assessment
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={0}>
          <Card className="h-full flex flex-col"> {/* Ensure cards can grow */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="h-5 w-5 text-primary"/>Last Completions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">{renderLastCompletionsWidget()}</CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={1}>
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <TrendingUp className="h-5 w-5 text-primary"/>Completion Streak
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    {renderStreakWidget()}
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={2}>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Filter className="h-5 w-5 text-primary"/>Common Responses
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">{renderCommonResponsesWidget()}</CardContent>
            </Card>
        </motion.div>

        {/* Placeholder cards from screenshot */}
         <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={3}>
            <CriticalTasksCard />
        </motion.div>
         <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={4}>
            <UpcomingEventsCard />
        </motion.div>
         <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={5}>
            <EmergencyProtocolsCard />
        </motion.div>
      </div>

      {/* News Modal - Keep this logic if needed, or remove if news is not a dashboard priority based on screenshot */}
      <Dialog open={!!selectedNewsItem} onOpenChange={(open) => !open && setSelectedNewsItem(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl line-clamp-2">{selectedNewsItem?.title}</DialogTitle>
            <DialogDescription>
              {selectedNewsItem?.pubDate && new Date(selectedNewsItem.pubDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedNewsItem?.content || selectedNewsItem?.description || "" }}
            />
          </ScrollArea>
           <CardFooter className="mt-4">
            <Button variant="outline" asChild>
              <a href={selectedNewsItem?.link} target="_blank" rel="noopener noreferrer">
                Read Full Article <ExternalLink className="ml-2 h-4 w-4"/>
              </a>
            </Button>
          </CardFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
