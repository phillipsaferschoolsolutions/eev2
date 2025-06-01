
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarDays, CloudSun, Newspaper, ShieldAlert, ListChecks, Edit3, FileText } from "lucide-react";
import Image from "next/image";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to EagleEyED<sup>TM</sup></h1>
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
              <h3 className="font-semibold mb-2">Weather: Anytown, USA</h3>
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <CloudSun className="h-12 w-12 text-primary" />
                <div>
                  <p className="text-2xl font-bold">72°F, Sunny</p>
                  <p className="text-sm text-muted-foreground">Wind: 5mph W, Humidity: 45%</p>
                </div>
              </div>
            </div>
            <div>
                <h3 className="font-semibold mb-2">Campus News Highlights</h3>
                <ul className="space-y-2 text-sm">
                    <li className="hover:bg-muted/50 p-2 rounded-md transition-colors"><a href="#" className="text-primary hover:underline">New library wing opening next month.</a></li>
                    <li className="hover:bg-muted/50 p-2 rounded-md transition-colors"><a href="#" className="text-primary hover:underline">Upcoming fundraiser for sports facilities.</a></li>
                    <li className="hover:bg-muted/50 p-2 rounded-md transition-colors"><a href="#" className="text-primary hover:underline">Student council election results.</a></li>
                </ul>
                <Button variant="link" className="mt-2 px-0">View all news (Google Newsfeed)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
