
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarDays, CloudSun, Newspaper, ShieldAlert, ListChecks, Edit3, FileText, ExternalLink, Info } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getWeatherAndLocation, type WeatherLocationData } from "@/services/assignmentFunctionsService";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string; // Raw content which might include HTML
  description: string; // Usually a shorter summary, might also have HTML
  guid: string;
  thumbnail?: string;
}

interface RssResponse {
  status: string;
  feed: object;
  items: NewsItem[];
}

const GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search?q=K-12+school+security+OR+school+cybersecurity&hl=en-US&gl=US&ceid=US:en";
const RSS2JSON_API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(GOOGLE_NEWS_RSS_URL)}`;


// Function to sanitize HTML from strings
const sanitizeHTML = (htmlString: string): string => {
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
  }
  // Fallback for server-side or environments without DOMParser
  return htmlString.replace(/<[^>]+>/g, '');
};


export default function DashboardPage() {
  const { userProfile } = useAuth();
  const [weatherData, setWeatherData] = useState<WeatherLocationData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);

  useEffect(() => {
    // Fetch Weather
    const fetchWeather = () => {
      if (!navigator.geolocation) {
        setWeatherError("Geolocation is not supported by your browser.");
        setWeatherLoading(false);
        return;
      }

      setWeatherLoading(true);
      setWeatherError(null);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            console.log("[DashboardPage] Attempting to fetch weather. User profile account:", userProfile?.account); // Diagnostic log
            if (userProfile?.account) {
              const data = await getWeatherAndLocation(
                position.coords.latitude,
                position.coords.longitude,
                userProfile.account
              );
              setWeatherData(data);
            } else {
              setWeatherError("User account information not available for weather. Cannot set 'account' header.");
            }
          } catch (err) {
            setWeatherError(err instanceof Error ? err.message : "Failed to fetch weather data.");
          } finally {
            setWeatherLoading(false);
          }
        },
        (error) => {
          setWeatherError(`Geolocation error: ${error.message}. Please enable location services.`);
          setWeatherLoading(false);
        }
      );
    };

    // Fetch News
    const fetchNews = async () => {
      setNewsLoading(true);
      setNewsError(null);
      try {
        const response = await fetch(RSS2JSON_API_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch news: ${response.statusText}`);
        }
        const data: RssResponse = await response.json();
        if (data.status === "ok") {
          setNewsItems(data.items.slice(0, 5)); // Limit to 5 news items
        } else {
          throw new Error("News feed API returned an error.");
        }
      } catch (err) {
        setNewsError(err instanceof Error ? err.message : "Failed to fetch news.");
      } finally {
        setNewsLoading(false);
      }
    };

    if (userProfile !== undefined) { // Ensures userProfile state from AuthContext is initialized
        fetchWeather();
    }
    fetchNews();

  }, [userProfile]); // Re-run if userProfile changes (e.g., after login)


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to EagleEyED™</h1>
          <p className="text-muted-foreground">Your central hub for campus safety management.</p>
        </div>
        <div className="flex gap-2">
            <Button><ListChecks className="mr-2 h-4 w-4" /> View All Tasks</Button>
            <Button variant="outline"><Edit3 className="mr-2 h-4 w-4" /> New Assessment</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Critical Tasks
            </CardTitle>
            <CardDescription>High-priority items needing immediate attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <span>Inspect broken fence near West Gate</span>
                <Button variant="ghost" size="sm">Details</Button>
              </li>
              <li className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <span>Review fire drill report</span>
                <Button variant="ghost" size="sm">Details</Button>
              </li>
              <li className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <span>Restock first-aid kit - Gym</span>
                <Button variant="ghost" size="sm">Details</Button>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">View All Critical Tasks</Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Upcoming Events & Drills
            </CardTitle>
            <CardDescription>Scheduled safety events and drills.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
                <li className="p-2 rounded-md"><strong>Campus Safety Workshop:</strong> Tomorrow, 10 AM</li>
                <li className="p-2 rounded-md"><strong>Fire Drill (Block B):</strong> Oct 28, 2 PM</li>
                <li className="p-2 rounded-md"><strong>Security Team Meeting:</strong> Nov 2, 9 AM</li>
            </ul>
          </CardContent>
           <CardFooter>
            <Button variant="outline" className="w-full">View Calendar</Button>
          </CardFooter>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-accent" />
              Emergency Protocols
            </CardTitle>
            <CardDescription>Quick actions for emergency situations.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Button variant="destructive" className="w-full justify-start text-base p-3">
              <ShieldAlert className="mr-2 h-5 w-5" /> Initiate Lockdown
            </Button>
            <Button variant="outline" className="w-full justify-start text-base p-3">
              <FileText className="mr-2 h-5 w-5" /> Report Incident
            </Button>
             <Button variant="secondary" className="w-full justify-start text-base p-3">
              <Newspaper className="mr-2 h-5 w-5" /> Send Alert
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudSun className="h-6 w-6 text-yellow-500" />
              Local Weather & News
            </CardTitle>
             <CardDescription>Stay informed about local conditions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Weather: {weatherData?.name || "Loading..."}</h3>
              {weatherLoading ? (
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div>
                        <Skeleton className="h-7 w-32 mb-1" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
              ) : weatherError ? (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Weather Error</AlertTitle>
                  <AlertDescription>{weatherError}</AlertDescription>
                </Alert>
              ) : weatherData ? (
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <CloudSun className="h-12 w-12 text-primary" /> {/* Consider dynamic icon based on weatherData.weather[0].icon */}
                  <div>
                    <p className="text-2xl font-bold">{Math.round(weatherData.current?.temp ?? 0)}°F, {weatherData.current?.weather?.[0]?.description ?? 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">
                      Wind: {Math.round(weatherData.current?.wind_speed ?? 0)}mph, Humidity: {weatherData.current?.humidity ?? 0}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Weather data not available.</p>
              )}
            </div>
            <div>
                <h3 className="font-semibold mb-2">Campus Safety News</h3>
                {newsLoading ? (
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : newsError ? (
                     <Alert variant="destructive">
                        <Info className="h-4 w-4" />
                        <AlertTitle>News Error</AlertTitle>
                        <AlertDescription>{newsError}</AlertDescription>
                    </Alert>
                ) : newsItems.length > 0 ? (
                    <ScrollArea className="h-[200px] pr-3">
                        <ul className="space-y-2 text-sm">
                            {newsItems.map((item) => (
                                <li key={item.guid} className="hover:bg-muted/50 p-2 rounded-md transition-colors">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <button className="text-left w-full" onClick={() => setSelectedNewsItem(item)}>
                                                <span className="font-medium text-primary hover:underline block truncate">{item.title}</span>
                                                <span className="text-xs text-muted-foreground">{new Date(item.pubDate).toLocaleDateString()}</span>
                                            </button>
                                        </DialogTrigger>
                                        {selectedNewsItem?.guid === item.guid && (
                                        <DialogContent className="sm:max-w-[625px]">
                                            <DialogHeader>
                                                <DialogTitle>{selectedNewsItem.title}</DialogTitle>
                                                <DialogDescription>
                                                    Published: {new Date(selectedNewsItem.pubDate).toLocaleString()}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <ScrollArea className="max-h-[50vh] pr-4">
                                                <div className="text-sm text-muted-foreground py-4 whitespace-pre-wrap break-words"
                                                     dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedNewsItem.content || selectedNewsItem.description || "No content available.") }} />
                                            </ScrollArea>
                                            <DialogFooter>
                                                <Button variant="outline" asChild>
                                                    <a href={selectedNewsItem.link} target="_blank" rel="noopener noreferrer">
                                                        Read Full Article <ExternalLink className="ml-2 h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                        )}
                                    </Dialog>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                ) : (
                    <p className="text-sm text-muted-foreground">No news articles found.</p>
                )}
                <Button variant="link" className="mt-2 px-0" asChild>
                    <a href="https://news.google.com/search?q=K-12%20school%20security%20OR%20school%20cybersecurity&hl=en-US&gl=US&ceid=US%3Aen" target="_blank" rel="noopener noreferrer">
                        View all on Google News <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

    