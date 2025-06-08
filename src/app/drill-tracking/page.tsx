
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function DrillTrackingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drill Tracking & Scheduling</h1>
          <p className="text-lg text-muted-foreground">
            Manage, schedule, and track campus-wide safety drills.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/drill-tracking/new">
            <FilePlus2 className="mr-2 h-5 w-5" /> Create New Drill Event
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Drills</CardTitle>
          <CardDescription>
            A list of scheduled drills will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-semibold">Drill Scheduling Coming Soon</p>
            <p className="text-sm">
              This section will display upcoming and active drill events.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Drill Log & History</CardTitle>
          <CardDescription>
            Review completed drills and their reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-semibold">Drill Logging Features Under Development</p>
            <p className="text-sm">
              Completed drills and after-action reports will be accessible here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
