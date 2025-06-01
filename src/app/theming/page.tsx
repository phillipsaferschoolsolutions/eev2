
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Sun, Moon, Contrast, Terminal, Waves, Leaf, Sunset, Building, Flame, Sparkles, Trees, Cpu, Snowflake, Mountain, Fish, Scroll, Edit3, Binary, Wand2, CircuitBoard } from "lucide-react";
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

  // 14 Additional Themes Start Here
  { id: "arctic-horizon-light", name: "Arctic Horizon (Light)", description: "Cool whites, icy blues, and pale lavenders.", icon: Snowflake, isDark: false, gradient: "from-sky-200 via-blue-300 to-purple-200" },
  { id: "arctic-horizon-dark", name: "Arctic Horizon (Dark)", description: "Deep blues, purples, and aurora-like greens.", icon: Mountain, isDark: true, gradient: "from-blue-800 via-purple-700 to-teal-600" },

  { id: "volcanic-glow-light", name: "Volcanic Glow (Light)", description: "Charcoal greys with fiery lava reds and oranges.", icon: Flame, isDark: false, gradient: "from-gray-300 via-red-500 to-orange-400" },
  { id: "volcanic-glow-dark", name: "Volcanic Glow (Dark)", description: "Deep reds, magma oranges, and dark volcanic rock.", icon: Flame, isDark: true, gradient: "from-black via-red-700 to-orange-500" },

  { id: "coral-reef-light", name: "Coral Reef (Light)", description: "Sunny yellows, vibrant teals, and warm corals.", icon: Fish, isDark: false, gradient: "from-yellow-200 via-teal-300 to-pink-300" },
  { id: "coral-reef-dark", name: "Coral Reef (Dark)", description: "Deep ocean blues with bioluminescent greens and pinks.", icon: Fish, isDark: true, gradient: "from-blue-900 via-green-500 to-pink-600" },

  { id: "retro-funk-light", name: "Retro Funk (Light)", description: "Groovy oranges, mustard yellows, and avocado greens.", icon: Palette, isDark: false, gradient: "from-orange-300 via-yellow-400 to-lime-400" },
  { id: "retro-funk-dark", name: "Retro Funk (Dark)", description: "Dark browns, muted oranges, and deep teals.", icon: Palette, isDark: true, gradient: "from-yellow-700 via-orange-800 to-teal-700" },

  { id: "urban-jungle-light", name: "Urban Jungle (Light)", description: "Concrete greys, steel blues, with vibrant graffiti pops.", icon: Building, isDark: false, gradient: "from-slate-300 via-sky-400 to-pink-400" },
  { id: "urban-jungle-dark", name: "Urban Jungle (Dark)", description: "Dark greys, deep blues, with subtle neon highlights.", icon: Building, isDark: true, gradient: "from-gray-800 via-blue-700 to-lime-600" },

  { id: "vintage-paper-light", name: "Vintage Paper (Light)", description: "Sepia tones, creams, and faded ink blues.", icon: Scroll, isDark: false, gradient: "from-yellow-100 via-orange-200 to-blue-200" },
  { id: "vintage-paper-dark", name: "Vintage Paper (Dark)", description: "Aged parchment, deep ink blues, and rich browns.", icon: Scroll, isDark: true, gradient: "from-orange-900 via-blue-800 to-yellow-800" },

  { id: "digital-dreams-light", name: "Digital Dreams (Light)", description: "Electric blues, purples, and pinks with sharp contrasts.", icon: CircuitBoard, isDark: false, gradient: "from-sky-300 via-purple-400 to-pink-400" },
  { id: "digital-dreams-dark", name: "Digital Dreams (Dark)", description: "Deep indigos, vibrant magentas, on a dark tech background.", icon: CircuitBoard, isDark: true, gradient: "from-indigo-700 via-fuchsia-600 to-blue-800" },
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
                  <themeOption.icon className={`h-12 w-12 ${themeOption.isDark ? 'text-white' : 'text-primary-foreground' } opacity-80`} />
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

