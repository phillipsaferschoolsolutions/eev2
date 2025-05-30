
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCircle, Bell, ShieldCheck, Palette } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary" /> Profile Settings</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue="John Doe" />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue="john.doe@example.com" />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
            </div>
            <Button className="w-full">Save Profile</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notification Preferences</CardTitle>
            <CardDescription>Choose how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="email-notifications" defaultChecked />
              <Label htmlFor="email-notifications">Email Notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="sms-notifications" />
              <Label htmlFor="sms-notifications">SMS Notifications (for critical alerts)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="inapp-notifications" defaultChecked />
              <Label htmlFor="inapp-notifications">In-App Notifications</Label>
            </div>
            <Button className="w-full">Save Preferences</Button>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Appearance</CardTitle>
            <CardDescription>Customize the look and feel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-muted-foreground">Theme settings are available on the <a href="/theming" className="text-primary underline">Theming page</a>.</p>
             <div>
              <Label htmlFor="fontSize">Font Size</Label>
                <select id="fontSize" defaultValue="medium" className="w-full p-2 border rounded-md bg-input">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                </select>
             </div>
            <Button className="w-full">Save Appearance Settings</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Security & Access</CardTitle>
            <CardDescription>Manage your password and access controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Change Password</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
              </div>
              <Button className="mt-4">Update Password</Button>
            </div>
            <div>
              <h3 className="font-medium mb-2">Two-Factor Authentication (2FA)</h3>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <p className="text-sm">Status: <span className="font-semibold text-destructive">Disabled</span></p>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
