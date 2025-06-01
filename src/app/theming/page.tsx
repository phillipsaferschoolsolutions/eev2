
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Sun, Moon, Contrast, Terminal, Waves, Leaf, Sunset, Building, Flame, Sparkles, Trees, Cpu, Cloud, Mountain, Fish, Snowflake } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

const appThemes = [
  { id: "light", name: "Default Light", description: "The standard clean and professional theme.", icon: Sun, isDark: false, gradient: "from-blue-100 to-indigo-100" },
  { id: "dark", name: "Default Dark", description: "For low-light conditions, reduces eye strain.", icon: Moon, isDark: true, gradient: "from-slate-800 to-slate-900" },
  { id: "corporate-blue", name: "Corporate Blue", description: "A light theme with a focus on professional blue tones.", icon: Building, isDark: false, gradient: "from-sky-100 to-blue-200" },
  { id: "matrix", name: "Matrix", description: "Dark theme with green text on a black background.", icon: Terminal, isDark: true, gradient: "from-green-900 to-black" },
  { id: "desert-light", name: "Desert Oasis", description: "Light theme with warm, sandy, and terracotta tones.", icon: Sunset, isDark: false, gradient: "from-yellow-100 to-orange-200" },
  { id: "ocean-deep", name: "Ocean Depths", description: "Dark theme with deep blues and aquas.", icon: Waves, isDark: true, gradient: "from-cyan-800 to-blue-900" },
  { id: "spring-meadow", name: "Spring Bloom", description: "Light theme with vibrant greens and sunny yellows.", icon: Leaf, isDark: false, gradient: "from-lime-100 to-green-200" },
  { id: "slate-contrast", name: "Modern Slate", description: "A dark theme with neutral grays and good contrast.", icon: Palette, isDark: true, gradient: "from-gray-700 to-slate-800" },
  { id: "high-contrast-dark", name: "High Contrast Dark", description: "Maximizes readability with a dark background.", icon: Contrast, isDark: true, gradient: "from-black to-gray-600" },
  { id: "high-contrast-light", name: "High Contrast Light", description: "Maximizes readability with a light background.", icon: Contrast, isDark: false, gradient: "from-white to-gray-200" },
  
  { id: "solar-flare-light", name: "Solar Flare (Light)", description: "Bright oranges & yellows. Energetic & warm.", icon: Flame, isDark: false, gradient: "from-yellow-300 via-orange-400 to-red-400" },
  { id: "solar-flare-dark", name: "Solar Flare (Dark)", description: "Deep reds & burnt oranges. Intense & fiery.", icon: Flame, isDark: true, gradient: "from-red-700 via-orange-600 to-yellow-500" },
  
  { id: "nebula-night-light", name: "Nebula Dreams (Light)", description: "Ethereal light purples, pinks & silvers.", icon: Sparkles, isDark: false, gradient: "from-purple-200 via-pink-200 to-indigo-200" },
  { id: "nebula-night-dark", name: "Nebula Night (Dark)", description: "Deep purples & blues, cosmic & mysterious.", icon: Sparkles, isDark: true, gradient: "from-indigo-700 via-purple-800 to-pink-700" },

  { id: "emerald-forest-light", name: "Emerald Forest (Light)", description: "Rich greens & teals. Natural & calming.", icon: Trees, isDark: false, gradient: "from-green-300 via-emerald-400 to-teal-500" },
  { id: "emerald-forest-dark", name: "Emerald Forest (Dark)", description: "Deep forest greens & moonlit silvers.", icon: Trees, isDark: true, gradient: "from-green-800 via-teal-700 to-slate-600" },

  { id: "cyber-city-light", name: "Cyber City (Light)", description: "Clean light greys & electric blues. Modern tech.", icon: Cpu, isDark: false, gradient: "from-sky-200 via-cyan-300 to-blue-300" },
  { id: "cyber-city-dark", name: "Cyber City (Dark)", description: "Electric blues & cyans on dark. Futuristic.", icon: Cpu, isDark: true, gradient: "from-blue-800 via-cyan-600 to-slate-900" },
];

export default function ThemingPage() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
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
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {appThemes.map((themeOption) => (
            <Card key={themeOption.id} className="overflow-hidden flex flex-col">
              <CardHeader className="p-0">
                <div
                  className={`h-32 w-full flex items-center justify-center bg-gradient-to-br ${themeOption.gradient}`}
                  data-ai-hint="theme color palette"
                >
                  <themeOption.icon className={`h-12 w-12 ${themeOption.isDark && currentTheme !== 'dark' && !themeOption.id.includes('dark') ? 'text-primary' : (themeOption.id.includes('dark') || currentTheme ==='dark' ? 'text-white' : 'text-primary') }`} />
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow flex flex-col">
                <h3 className="text-lg font-semibold mb-1">{themeOption.name}</h3>
                <p className="text-sm text-muted-foreground mb-3 h-16 flex-grow">{themeOption.description}</p>
                <Button
                  onClick={() => handleThemeChange(themeOption.id)}
                  className="w-full mt-auto"
                  variant={mounted && currentTheme === themeOption.id ? "default" : "outline"}
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
    </div>
  );
}
