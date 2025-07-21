"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getAssets, createAsset } from "@/services/assetService";
import type { Asset } from "@/types/Asset";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { getUsersForAccount, type ChatUser } from "@/services/messagingService";
import { DatePicker } from "@/components/ui/date-picker";
import { 
  HardDrive, Plus, Search, Edit, Trash2, AlertTriangle, Loader2, 
  Package, MapPin, User, Calendar, Building, Hash, Wrench, Camera,
  X, BarChart3, PieChart, TrendingUp, Clock, Scan
} from "lucide-react";
import { formatDisplayDateShort } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Common asset types for the dropdown
const COMMON_ASSET_TYPES = [
  "Computer",
  "Laptop", 
  "Printer",
  "Scanner",
  "Projector",
  "Camera",
  "Security Camera",
  "Monitor",
  "Tablet",
  "Phone",
  "Router",
  "Switch",
  "Server",
  "UPS",
  "Fire Extinguisher",
  "AED Device",
  "Radio",
  "Intercom System",
  "Access Control Panel",
  "Emergency Light",
  "Smoke Detector",
  "Other"
];

// Colors for charts
const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1'
];

export default function AssetsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  
  // State for locations and users
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for create dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // State for barcode scanning
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // State for data visualization filters
  const [visualizationFilter, setVisualizationFilter] = useState<string>("all");
  
  // Filter assets based on search term
  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.assignedToName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // State for new asset form
  const [newAssetData, setNewAssetData] = useState({
    name: "",
    type: "",
    customType: "",
    serialNumber: "",
    model: "",
    manufacturer: "",
    condition: "Good" as Asset['condition'],
    locationId: "",
    assignedToId: "unassigned", 
    notes: "",
    purchaseDate: undefined as Date | undefined,
    warrantyExpiry: undefined as Date | undefined,
  });
  
  // Fetch assets when component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchAssets();
    }
  }, [userProfile?.account, authLoading]);
  
  // Function to fetch assets
  const fetchAssets = useCallback(async () => {
    if (!userProfile?.account) return;
    
    setIsLoadingAssets(true);
    setAssetsError(null);
    
    try {
      const fetchedAssets = await getAssets(userProfile.account);
      setAssets(fetchedAssets);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      setAssetsError("Failed to load assets. Please try again.");
      toast({ variant: "destructive", title: "Error Loading Assets", description: (error as Error).message });
    } finally {
      setIsLoadingAssets(false);
    }
  }, [userProfile?.account, toast]);
  
  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      if (!userProfile?.account) return;
      
      try {
        const fetchedLocations = await getLocationsForLookup(userProfile.account);
        setLocations(fetchedLocations);
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      }
    };
    
    if (!authLoading && userProfile?.account) {
      fetchLocations();
    }
  }, [userProfile?.account, authLoading]);
  
  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userProfile?.account) return;
      
      try {
        const fetchedUsers = await getUsersForAccount(userProfile.account);
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    
    if (!authLoading && userProfile?.account) {
      fetchUsers();
    }
  }, [userProfile?.account, authLoading]);
  
  // Calculate asset age in years
  const calculateAssetAge = (purchaseDate: any): number => {
    if (!purchaseDate) return 0;
    
    let date: Date;
    if (typeof purchaseDate === 'string') {
      date = new Date(purchaseDate);
    } else if (purchaseDate.toDate) {
      date = purchaseDate.toDate();
    } else {
      date = new Date(purchaseDate);
    }
    
    const now = new Date();
    const ageInMs = now.getTime() - date.getTime();
    return Math.max(0, ageInMs / (1000 * 60 * 60 * 24 * 365.25));
  };
  
  // Prepare data for average age by type chart
  const averageAgeByType = useCallback(() => {
    const typeGroups: Record<string, { totalAge: number; count: number }> = {};
    
    assets.forEach(asset => {
      if (!asset.purchaseDate) return;
      
      const age = calculateAssetAge(asset.purchaseDate);
      if (!typeGroups[asset.type]) {
        typeGroups[asset.type] = { totalAge: 0, count: 0 };
      }
      typeGroups[asset.type].totalAge += age;
      typeGroups[asset.type].count += 1;
    });
    
    return Object.entries(typeGroups).map(([type, data]) => ({
      type,
      averageAge: Number((data.totalAge / data.count).toFixed(1)),
      count: data.count
    })).sort((a, b) => b.averageAge - a.averageAge);
  }, [assets]);
  
  // Prepare data for asset distribution by location
  const assetDistributionByLocation = useCallback(() => {
    const filteredAssetsByType = visualizationFilter === "all" 
      ? assets 
      : assets.filter(asset => asset.type === visualizationFilter);
    
    const locationGroups: Record<string, number> = {};
    
    filteredAssetsByType.forEach(asset => {
      const location = asset.locationName || 'Unassigned';
      locationGroups[location] = (locationGroups[location] || 0) + 1;
    });
    
    return Object.entries(locationGroups).map(([location, count]) => ({
      location,
      count
    })).sort((a, b) => b.count - a.count);
  }, [assets, visualizationFilter]);
  
  // Prepare data for condition distribution
  const conditionDistribution = useCallback(() => {
    const conditionGroups: Record<string, number> = {};
    
    assets.forEach(asset => {
      conditionGroups[asset.condition] = (conditionGroups[asset.condition] || 0) + 1;
    });
    
    return Object.entries(conditionGroups).map(([condition, count]) => ({
      condition,
      count
    }));
  }, [assets]);
  
  // Get unique asset types for filter dropdown
  const uniqueAssetTypes = [...new Set(assets.map(asset => asset.type))].sort();
  
  // Start camera for barcode scanning
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsScanning(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        variant: "destructive",
        title: "Camera Access Error",
        description: "Unable to access camera. Please check permissions."
      });
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
    setIsScannerOpen(false);
  };
  
  // Capture frame for barcode detection (simplified - in production you'd use a barcode library)
  const captureBarcode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // In a real implementation, you would use a barcode scanning library here
    // For now, we'll simulate a successful scan
    const simulatedBarcode = `BC${Date.now().toString().slice(-8)}`;
    setNewAssetData({ ...newAssetData, serialNumber: simulatedBarcode });
    stopCamera();
    
    toast({
      title: "Barcode Scanned",
      description: `Serial number captured: ${simulatedBarcode}`
    });
  };
  
  // Handle creating new asset
  const handleCreateAsset = async () => {
    if (!userProfile?.account) return;
    
    setIsCreating(true);
    
    try {
      // Use custom type if "Other" is selected and custom type is provided
      const finalType = newAssetData.type === "Other" && newAssetData.customType.trim() 
        ? newAssetData.customType.trim()
        : newAssetData.type;
      
      await createAsset({
        name: newAssetData.name,
        type: finalType,
        serialNumber: newAssetData.serialNumber,
        model: newAssetData.model,
        manufacturer: newAssetData.manufacturer,
        condition: newAssetData.condition,
        locationId: newAssetData.locationId,
        assignedToId: newAssetData.assignedToId === "unassigned" ? "" : newAssetData.assignedToId,
        notes: newAssetData.notes,
        purchaseDate: newAssetData.purchaseDate?.toISOString(),
        warrantyExpiry: newAssetData.warrantyExpiry?.toISOString(),
        account: userProfile.account
      });
      
      // Reset form
      setNewAssetData({
        name: "", type: "", customType: "", serialNumber: "", condition: "Good",
        model: "", manufacturer: "", locationId: "", assignedToId: "unassigned", notes: "",
        purchaseDate: undefined, warrantyExpiry: undefined
      });
      
      setIsCreateDialogOpen(false);
      fetchAssets(); // Refresh the assets list
      
      toast({
        title: "Asset Created",
        description: "The asset has been successfully added to your inventory."
      });
    } catch (error) {
      console.error("Failed to create asset:", error);
      toast({
        variant: "destructive",
        title: "Error Creating Asset",
        description: (error as Error).message
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  if (!user || !userProfile) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to view assets.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-lg text-muted-foreground">
            Manage and track hardware assets for account: {userProfile?.account || "Loading..."}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      </div>
      
      {/* Data Visualization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Assets Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
            <p className="text-xs text-muted-foreground">
              {uniqueAssetTypes.length} different types
            </p>
          </CardContent>
        </Card>
        
        {/* Assets Needing Attention */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {assets.filter(a => a.condition === 'Needs Repair' || a.condition === 'Missing').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Repair or missing assets
            </p>
          </CardContent>
        </Card>
        
        {/* Average Asset Age */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Age</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assets.length > 0 ? (
                assets.reduce((sum, asset) => sum + calculateAssetAge(asset.purchaseDate), 0) / assets.length
              ).toFixed(1) : '0'} years
            </div>
            <p className="text-xs text-muted-foreground">
              Across all assets
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Age by Type Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Average Age by Asset Type
            </CardTitle>
            <CardDescription>
              Shows the average age in years for each type of asset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={averageAgeByType()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="type" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `${value} years`, 
                      'Average Age'
                    ]}
                    labelFormatter={(label) => `Asset Type: ${label}`}
                  />
                  <Bar dataKey="averageAge" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Asset Distribution by Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Asset Distribution by Location
            </CardTitle>
            <CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <span>Filter by type:</span>
                <Select value={visualizationFilter} onValueChange={setVisualizationFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueAssetTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Tooltip />
                  <Legend />
                  <RechartsPieChart
                    data={assetDistributionByLocation()}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    nameKey="location"
                  >
                    {assetDistributionByLocation().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </RechartsPieChart>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Condition Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Asset Condition Distribution
          </CardTitle>
          <CardDescription>
            Overview of asset conditions across your inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conditionDistribution()} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="condition" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Assets
          </CardTitle>
          <CardDescription>
            View and manage all hardware assets in your inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assets..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {isLoadingAssets ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assetsError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{assetsError}</AlertDescription>
            </Alert>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <p className="text-lg font-semibold">No Assets Found</p>
              <p className="text-muted-foreground">
                {searchTerm ? "No assets match your search criteria." : "No assets have been added yet."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">
                        {asset.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          {asset.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {asset.serialNumber || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          {asset.model || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {asset.locationName || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {asset.assignedToName || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          asset.condition === 'Good' ? 'default' :
                          asset.condition === 'Needs Repair' ? 'destructive' :
                          asset.condition === 'Retired' ? 'secondary' :
                          'outline'
                        }>
                          {asset.condition === 'Needs Repair' && <Wrench className="mr-1 h-3 w-3" />}
                          {asset.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {asset.purchaseDate ? `${calculateAssetAge(asset.purchaseDate).toFixed(1)} years` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create Asset Dialog */}
      {isCreateDialogOpen && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogDescription>
                Enter the details for the new hardware asset.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Asset Name</Label>
                <Input
                  id="name"
                  value={newAssetData.name}
                  onChange={(e) => setNewAssetData({ ...newAssetData, name: e.target.value })}
                  placeholder="Enter asset name..."
                />
              </div>
              
              <div>
                <Label htmlFor="type">Asset Type</Label>
                <Select
                  value={newAssetData.type}
                  onValueChange={(value) => setNewAssetData({ ...newAssetData, type: value, customType: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or enter asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ASSET_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newAssetData.type === "Other" && (
                  <div className="mt-2">
                    <Input
                      value={newAssetData.customType}
                      onChange={(e) => setNewAssetData({ ...newAssetData, customType: e.target.value })}
                      placeholder="Enter custom asset type..."
                    />
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="serialNumber"
                    value={newAssetData.serialNumber}
                    onChange={(e) => setNewAssetData({ ...newAssetData, serialNumber: e.target.value })}
                    placeholder="Enter serial number or scan barcode..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3"
                  >
                    <Scan className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={newAssetData.model}
                  onChange={(e) => setNewAssetData({ ...newAssetData, model: e.target.value })}
                  placeholder="Enter model..."
                />
              </div>
              
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={newAssetData.manufacturer}
                  onChange={(e) => setNewAssetData({ ...newAssetData, manufacturer: e.target.value })}
                  placeholder="Enter manufacturer..."
                />
              </div>
              
              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={newAssetData.condition}
                  onValueChange={(value) => setNewAssetData({ ...newAssetData, condition: value as Asset['condition'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="Missing">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  value={newAssetData.locationId}
                  onValueChange={(value) => setNewAssetData({ ...newAssetData, locationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.locationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="assignee">Assigned To</Label>
                <Select
                  value={newAssetData.assignedToId}
                  onValueChange={(value) => setNewAssetData({ ...newAssetData, assignedToId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.uid} value={user.uid}>
                        {user.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <DatePicker
                  date={newAssetData.purchaseDate}
                  setDate={(date) => setNewAssetData({ ...newAssetData, purchaseDate: date })}
                />
              </div>
              
              <div>
                <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                <DatePicker
                  date={newAssetData.warrantyExpiry}
                  setDate={(date) => setNewAssetData({ ...newAssetData, warrantyExpiry: date })}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newAssetData.notes}
                  onChange={(e) => setNewAssetData({ ...newAssetData, notes: e.target.value })}
                  placeholder="Additional notes about this asset..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAsset} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Asset
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Barcode Scanner Dialog */}
      {isScannerOpen && (
        <Dialog open={isScannerOpen} onOpenChange={(open) => {
          if (!open) {
            stopCamera();
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Scan Barcode</DialogTitle>
              <DialogDescription>
                Position the barcode within the camera view and tap capture when ready.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Button onClick={startCamera}>
                      <Camera className="mr-2 h-4 w-4" />
                      Start Camera
                    </Button>
                  </div>
                )}
              </div>
              
              {isScanning && (
                <div className="flex gap-2">
                  <Button onClick={captureBarcode} className="flex-1">
                    <Scan className="mr-2 h-4 w-4" />
                    Capture Barcode
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Note: This is a simplified barcode scanner. In production, you would integrate with a proper barcode scanning library like ZXing or QuaggaJS.
                </AlertDescription>
              </Alert>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}