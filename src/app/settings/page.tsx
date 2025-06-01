
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserCircle, Bell, ShieldCheck, Palette, LayoutList, SidebarOpen, Rows3 } from "lucide-react";
import { useLayout, type LayoutMode } from "@/context/layout-context";
import Link from "next/link";

const layoutOptions: { value: LayoutMode; label: string; description: string; icon: React.ElementType }[] = [
  { value: "standard", label: "Standard Layout", description: "Classic sidebar navigation with a top header.", icon: SidebarOpen },
  { value: "topNav", label: "Top Navigation", description: "Main navigation in the header, maximizing content area.", icon: Rows3 },
  { value: "minimalIcon", label: "Minimal Icon Sidebar", description: "Icon-only sidebar for a focused experience.", icon: LayoutList },
];

export default function SettingsPage() {
  const { layoutMode, setLayoutMode } = useLayout();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, layout, and application preferences.</p>
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
              <Input id="name" defaultValue="John Doe" placeholder="Your full name" />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue="john.doe@example.com" placeholder="your.email@example.com" />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" placeholder="+1 (555) 123-4567" />
            </div>
            <Button className="w-full">Save Profile</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LayoutList className="h-5 w-5 text-primary" /> Layout Preferences</CardTitle>
            <CardDescription>Choose your preferred application layout.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={layoutMode} onValueChange={(value) => setLayoutMode(value as LayoutMode)} className="space-y-3">
              {layoutOptions.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`layout-${option.value}`}
                  className="flex flex-col items-start cursor-pointer rounded-md border p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                >
                  <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <option.icon className="h-5 w-5" />
                        <span className="font-semibold">{option.label}</span>
                      </div>
                      <RadioGroupItem value={option.value} id={`layout-${option.value}`} className="shrink-0" />
                  </div>
                  <span className="block text-xs text-muted-foreground mt-1 pl-7">{option.description}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Appearance</CardTitle>
            <CardDescription>Customize the look and feel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-muted-foreground">
               Choose your color scheme on the <Link href="/theming" className="text-primary underline hover:text-primary/80">Theming page</Link>.
             </p>
             <div>
              <Label htmlFor="fontSize">Font Size (Coming Soon)</Label>
                <select id="fontSize" defaultValue="medium" className="w-full p-2 border rounded-md bg-input text-muted-foreground" disabled>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                </select>
             </div>
            <Button className="w-full" disabled>Save Appearance</Button>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3"> {/* Spans full width on larger screens */}
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notification Preferences</CardTitle>
            <CardDescription>Choose how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="email-notifications" defaultChecked />
              <Label htmlFor="email-notifications">Email Notifications for important updates</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="sms-notifications" />
              <Label htmlFor="sms-notifications">SMS Notifications for critical alerts (requires verified phone)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="inapp-notifications" defaultChecked />
              <Label htmlFor="inapp-notifications">In-App Notifications for real-time events</Label>
            </div>
            <Button className="w-full sm:w-auto">Save Notification Preferences</Button>
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
