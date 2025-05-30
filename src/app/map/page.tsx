import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Route, Building } from "lucide-react";
import Image from "next/image";

export default function MapPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Interactive Campus Map</h1>
      <p className="text-lg text-muted-foreground">
        Visualize safety resources, emergency assembly points, and critical infrastructure.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Campus Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-[16/9] bg-muted rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
            <Image 
              src="https://placehold.co/1200x675.png" 
              alt="Campus Map Placeholder" 
              width={1200} 
              height={675}
              className="object-cover w-full h-full"
              data-ai-hint="campus map aerial" 
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Resources</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25 Active</div>
            <p className="text-xs text-muted-foreground">Blue light phones, AEDs, First Aid Stations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Routes</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 Defined</div>
            <p className="text-xs text-muted-foreground">Evacuation paths & assembly points</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key Buildings</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8 Highlighted</div>
            <p className="text-xs text-muted-foreground">Admin, Library, Labs, Dorms</p>
          </CardContent>
        </Card>
      </div>
       <p className="text-center text-muted-foreground text-sm pt-4">
        Interactive map features coming soon.
      </p>
    </div>
  );
}
