import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CampusMap from "@/components/maps/CampusMap";

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
          <CampusMap />
        </CardContent>
      </Card>
    </div>
  );
}