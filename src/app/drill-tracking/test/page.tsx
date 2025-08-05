"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getAllDrillEvents, getAllDrillSubmissions } from "@/services/drillTrackingService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function DrillTrackingTestPage() {
  const { userProfile } = useAuth();
  const [testResults, setTestResults] = useState<{
    events: { success: boolean; error?: string; data?: any };
    submissions: { success: boolean; error?: string; data?: any };
  }>({
    events: { success: false },
    submissions: { success: false },
  });
  const [isTesting, setIsTesting] = useState(false);

  const runTests = async () => {
    if (!userProfile?.account) {
      alert("No account found. Please log in.");
      return;
    }

    setIsTesting(true);
    setTestResults({
      events: { success: false },
      submissions: { success: false },
    });

    try {
      // Test events endpoint
      try {
        const events = await getAllDrillEvents(userProfile.account);
        setTestResults(prev => ({
          ...prev,
          events: { success: true, data: events }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          events: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }));
      }

      // Test submissions endpoint
      try {
        const submissions = await getAllDrillSubmissions(userProfile.account);
        setTestResults(prev => ({
          ...prev,
          submissions: { success: true, data: submissions }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          submissions: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }));
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Drill Tracking API Test</h1>
        <Button onClick={runTests} disabled={isTesting}>
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Run Tests'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResults.events.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : testResults.events.error ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              Events Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.events.success ? (
              <div className="space-y-2">
                <p className="text-green-600 font-medium">✅ Success</p>
                <p className="text-sm text-gray-600">
                  Retrieved {testResults.events.data?.length || 0} drill events
                </p>
                {testResults.events.data && testResults.events.data.length > 0 && (
                  <div className="text-xs bg-gray-100 p-2 rounded">
                    <pre>{JSON.stringify(testResults.events.data[0], null, 2)}</pre>
                  </div>
                )}
              </div>
            ) : testResults.events.error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{testResults.events.error}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-gray-500">Click "Run Tests" to test this endpoint</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResults.submissions.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : testResults.submissions.error ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              Submissions Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.submissions.success ? (
              <div className="space-y-2">
                <p className="text-green-600 font-medium">✅ Success</p>
                <p className="text-sm text-gray-600">
                  Retrieved {testResults.submissions.data?.length || 0} drill submissions
                </p>
                {testResults.submissions.data && testResults.submissions.data.length > 0 && (
                  <div className="text-xs bg-gray-100 p-2 rounded">
                    <pre>{JSON.stringify(testResults.submissions.data[0], null, 2)}</pre>
                  </div>
                )}
              </div>
            ) : testResults.submissions.error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{testResults.submissions.error}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-gray-500">Click "Run Tests" to test this endpoint</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Account:</strong> {userProfile?.account || 'Not available'}</p>
            <p><strong>User:</strong> {userProfile?.email || 'Not available'}</p>
            <p><strong>API Base URL:</strong> https://drilltracking-re4xxcez2a-uc.a.run.app</p>
            <p><strong>Status:</strong> {
              testResults.events.success && testResults.submissions.success 
                ? '✅ All endpoints working' 
                : testResults.events.error || testResults.submissions.error 
                ? '❌ Some endpoints failed' 
                : '⏳ Not tested yet'
            }</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 