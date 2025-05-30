"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Sun, Moon, Contrast } from "lucide-react";

// Dummy theme options
const themes = [
  { id: "default", name: "Default Light", description: "The standard clean and professional theme.", icon: Sun },
  { id: "dark", name: "Easy Dark", description: "For low-light conditions, reduces eye strain.", icon: Moon },
  { id: "high-contrast", name: "High Contrast", description: "Improves visibility for users with visual impairments.", icon: Contrast },
  { id: "corporate-blue", name: "Corporate Blue", description: "A theme aligned with common corporate branding.", icon: Palette },
];

export default function ThemingPage() {
  // In a real app, you'd use a theme provider context (like next-themes)
  // const { theme, setTheme } = useTheme();

  const handleThemeChange = (themeId: string) => {
    // setTheme(themeId);
    alert(`Theme set to: ${themeId} (functionality pending)`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Theming Options</h1>
      <p className="text-lg text-muted-foreground">
        Personalize the application's appearance to suit your preferences or conform with corporate branding.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Select Your Theme</CardTitle>
          <CardDescription>Choose from the available themes below. Changes will apply instantly.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {themes.map((themeOption) => (
            <Card key={themeOption.id} className="overflow-hidden">
              <CardHeader className="p-0">
                {/* Placeholder for theme preview image */}
                <div
                  className={`h-32 w-full flex items-center justify-center bg-gradient-to-br
                    ${themeOption.id === 'default' ? 'from-blue-100 to-indigo-100' :
                    themeOption.id === 'dark' ? 'from-slate-800 to-slate-900' :
                    themeOption.id === 'high-contrast' ? 'from-black to-gray-700' :
                    'from-sky-600 to-indigo-700'}`}
                  data-ai-hint="theme color palette"
                >
                  <themeOption.icon className={`h-12 w-12 ${themeOption.id === 'dark' || themeOption.id === 'high-contrast' ? 'text-white' : 'text-primary'}`} />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-1">{themeOption.name}</h3>
                <p className="text-sm text-muted-foreground mb-3 h-10">{themeOption.description}</p>
                <Button
                  onClick={() => handleThemeChange(themeOption.id)}
                  className="w-full"
                  // variant={theme === themeOption.id ? "default" : "outline"} // Example of active state
                  variant="outline"
                >
                  Apply Theme
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Customization Tip</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                The application uses CSS variables for theming. Advanced users or administrators might be able to define custom themes by overriding these variables in the future. This would allow for precise branding alignment.
            </p>
        </CardContent>
      </Card>

      <p className="text-center text-muted-foreground text-sm pt-4">
        Full theme switching and customization features powered by `next-themes` or similar coming soon.
      </p>
    </div>
  );
}
