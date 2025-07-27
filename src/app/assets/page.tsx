"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  HardDrive, Plus, Search, Edit, Trash2, AlertTriangle, Loader2, 
  User, MapPin, ChevronLeft, ChevronRight
} from "lucide-react";
import { getAssets, createAsset, updateAsset, deleteAsset } from "@/services/assetService";
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/types/Asset";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { getUsersForAccount } from "@/services/messagingService";
import type { ChatUser } from "@/types/Message";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { usePersistedState } from "@/hooks/use-persisted-state";

export default function AssetsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // State for assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  
  // State for locations and users
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // State for search and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = usePersistedState('assets-current-page', 1);
  const [itemsPerPage, setItemsPerPage] = usePersistedState('assets-items-per-page', 10);
  
  // State for create asset dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAssetData, setNewAssetData] = useState({
    name: "",
    type: "",
    customType: "",
    serialNumber: "",
    model: "",
    manufacturer: "",
    purchaseDate: undefined as Date | undefined,
    warrantyExpiry: undefined as Date | undefined,
    condition: "Good" as Asset['condition'],
    locationId: "",
    assignedToId: "",
    notes: "",
    purchasePrice: "",
  });

  // State for edit asset dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editAssetData, setEditAssetData] = useState({
    name: "",
    type: "",
    customType: "",
    serialNumber: "",
    model: "",
    manufacturer: "",
    purchaseDate: undefined as Date | undefined,
    warrantyExpiry: undefined as Date | undefined,
    condition: "Good" as Asset['condition'],
    locationId: "",
    assignedToId: "",
    notes: "",
    purchasePrice: "",
  });

  // State for delete asset dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Predefined asset types
  const assetTypes = [
    "Computer", "Laptop", "Tablet", "Printer", "Scanner", "Projector", 
    "Monitor", "Keyboard", "Mouse", "Phone", "Security Camera", 
    "Fire Extinguisher", "AED", "First Aid Kit", "Other"
  ];

  // Fetch assets when component mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchAssets();
    }
  }, [userProfile?.account, authLoading]);

  // Fetch locations and users when needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchLocations();
      fetchUsers();
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
      toast({ variant: "destructive", title: "Error", description: "Failed to load assets." });
    } finally {
      setIsLoadingAssets(false);
    }
  }, [userProfile?.account, toast]);

  // Function to fetch locations
  const fetchLocations = async () => {
    if (!userProfile?.account) return;
    
    setIsLoadingLocations(true);
    try {
      const locs = await getLocationsForLookup(userProfile.account);
      setLocations(locs);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Function to fetch users
  const fetchUsers = async () => {
    if (!userProfile?.account) return;
    
    setIsLoadingUsers(true);
    try {
      const userList = await getUsersForAccount(userProfile.account, user?.uid || '', user?.email || '');
      setUsers(userList);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Function to handle creating a new asset
  const handleCreateAsset = async () => {
    if (!newAssetData.name.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Asset name is required." });
      return;
    }

    if (!newAssetData.type) {
      toast({ variant: "destructive", title: "Validation Error", description: "Asset type is required." });
      return;
    }

    setIsCreating(true);

    try {
      const finalType = newAssetData.type === "Other" ? newAssetData.customType : newAssetData.type;
      const finalAssignedToId = newAssetData.assignedToId === "unassigned" ? undefined : newAssetData.assignedToId;

      const payload: CreateAssetPayload = {
        name: newAssetData.name,
        type: finalType,
        serialNumber: newAssetData.serialNumber || undefined,
        model: newAssetData.model || undefined,
        manufacturer: newAssetData.manufacturer || undefined,
        purchaseDate: newAssetData.purchaseDate?.toISOString(),
        warrantyExpiry: newAssetData.warrantyExpiry?.toISOString(),
        condition: newAssetData.condition,
        locationId: newAssetData.locationId === "none" ? undefined : newAssetData.locationId || undefined,
        assignedToId: finalAssignedToId,
        notes: newAssetData.notes || undefined,
        purchasePrice: newAssetData.purchasePrice ? parseFloat(newAssetData.purchasePrice) : undefined,
      };

      await createAsset({ ...payload, account: userProfile!.account });
      
      toast({ title: "Success", description: "Asset created successfully." });
      
      setIsCreateDialogOpen(false);
      
      // Reset form
      setNewAssetData({
        name: "",
        type: "",
        customType: "",
        serialNumber: "",
        model: "",
        manufacturer: "",
        purchaseDate: undefined,
        warrantyExpiry: undefined,
        condition: "Good",
        locationId: "",
        assignedToId: "",
        notes: "",
        purchasePrice: "",
      });
      
      // Refresh assets
      fetchAssets();
    } catch (error) {
      console.error("Failed to create asset:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create asset. Please try again." });
    } finally {
      setIsCreating(false);
    }
  };

  // Function to open edit asset dialog
  const openEditDialog = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditAssetData({
      name: asset.name || "",
      type: assetTypes.includes(asset.type) ? asset.type : "Other",
      customType: assetTypes.includes(asset.type) ? "" : asset.type,
      serialNumber: asset.serialNumber || "",
      model: asset.model || "",
      manufacturer: asset.manufacturer || "",
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : undefined,
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : undefined,
      condition: asset.condition || "Good",
      locationId: asset.locationId || "",
      assignedToId: asset.assignedToId || "",
      notes: asset.notes || "",
      purchasePrice: asset.purchasePrice ? asset.purchasePrice.toString() : "",
    });
    setIsEditDialogOpen(true);
  };

  // Function to handle editing an asset
  const handleEditAsset = async () => {
    if (!selectedAsset) return;

    if (!editAssetData.name.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Asset name is required." });
      return;
    }

    if (!editAssetData.type) {
      toast({ variant: "destructive", title: "Validation Error", description: "Asset type is required." });
      return;
    }

    setIsUpdating(true);

    try {
      const finalType = editAssetData.type === "Other" ? editAssetData.customType : editAssetData.type;
      const finalAssignedToId = editAssetData.assignedToId === "unassigned" ? undefined : editAssetData.assignedToId;

      const payload: UpdateAssetPayload = {
        name: editAssetData.name,
        type: finalType,
        serialNumber: editAssetData.serialNumber || undefined,
        model: editAssetData.model || undefined,
        manufacturer: editAssetData.manufacturer || undefined,
        purchaseDate: editAssetData.purchaseDate?.toISOString(),
        warrantyExpiry: editAssetData.warrantyExpiry?.toISOString(),
        condition: editAssetData.condition,
        locationId: editAssetData.locationId === "none" ? undefined : editAssetData.locationId || undefined,
        assignedToId: finalAssignedToId,
        notes: editAssetData.notes || undefined,
        purchasePrice: editAssetData.purchasePrice ? parseFloat(editAssetData.purchasePrice) : undefined,
      };

      await updateAsset(selectedAsset.id, payload);
      
      toast({ title: "Success", description: "Asset updated successfully." });
      
      setIsEditDialogOpen(false);
      setSelectedAsset(null);
      
      // Refresh assets to get updated data
      fetchAssets();
    } catch (error) {
      console.error("Failed to update asset:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update asset. Please try again." });
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to open delete asset dialog
  const openDeleteDialog = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDeleteDialogOpen(true);
  };

  // Function to handle deleting an asset
  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;

    setIsDeleting(true);

    try {
      await deleteAsset(selectedAsset.id);
      
      toast({ title: "Success", description: "Asset deleted successfully." });
      
      setIsDeleteDialogOpen(false);
      setSelectedAsset(null);
      
      // Refresh assets
      fetchAssets();
    } catch (error) {
      console.error("Failed to delete asset:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete asset. Please try again." });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter assets based on search term
  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.locationName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handler for changing items per page
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Reset page when search term changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Calculate asset distribution by type
  const typeDistribution = assets.reduce((acc, asset) => {
    const type = asset.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(typeDistribution).map(([type, count]) => ({
    type,
    count,
  }));

  // Calculate asset distribution by condition
  const conditionDistribution = assets.reduce((acc, asset) => {
    const condition = asset.condition || 'Unknown';
    acc[condition] = (acc[condition] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const conditionChartData = Object.entries(conditionDistribution).map(([condition, count]) => ({
    condition,
    count,
  }));

  // Calculate asset distribution by location
  const locationDistribution = assets.reduce((acc, asset) => {
    const location = asset.locationName || 'Unassigned';
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const locationChartData = Object.entries(locationDistribution).map(([location, count]) => ({
    location,
    count,
  }));

  // Colors for pie charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need to be logged in to view assets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
          <p className="text-lg text-muted-foreground">
            Track and manage hardware assets for account: {userProfile?.account || "Loading..."}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      </div>

      {/* Asset Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Asset Distribution by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Asset Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={conditionChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ condition, count }) => `${condition}: ${count}`}
                  >
                    {conditionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Asset Distribution by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={locationChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ location, count }) => `${location}: ${count}`}
                  >
                    {locationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Assets
          </CardTitle>
          <CardDescription>
            View and manage all assets in your inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoadingAssets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : assetsError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{assetsError}</p>
              <Button onClick={fetchAssets} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No assets found matching your search." : "No assets found."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{asset.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          asset.condition === 'Good' ? 'default' :
                          asset.condition === 'Needs Repair' ? 'destructive' :
                          asset.condition === 'Retired' ? 'secondary' :
                          'outline'
                        }>
                          {asset.condition}
                        </Badge>
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
                      <TableCell>{asset.serialNumber || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(asset)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openDeleteDialog(asset)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredAssets.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Rows per page</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue placeholder={itemsPerPage} />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Asset Dialog */}
      {isCreateDialogOpen && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new asset to your inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                    onValueChange={(value) => setNewAssetData({ ...newAssetData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newAssetData.type === "Other" && (
                <div>
                  <Label htmlFor="customType">Custom Asset Type</Label>
                  <Input
                    id="customType"
                    value={newAssetData.customType}
                    onChange={(e) => setNewAssetData({ ...newAssetData, customType: e.target.value })}
                    placeholder="Enter custom asset type..."
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={newAssetData.serialNumber}
                    onChange={(e) => setNewAssetData({ ...newAssetData, serialNumber: e.target.value })}
                    placeholder="Enter serial number..."
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={newAssetData.purchaseDate ? newAssetData.purchaseDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setNewAssetData({ 
                      ...newAssetData, 
                      purchaseDate: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                  <Input
                    id="warrantyExpiry"
                    type="date"
                    value={newAssetData.warrantyExpiry ? newAssetData.warrantyExpiry.toISOString().split('T')[0] : ''}
                    onChange={(e) => setNewAssetData({ 
                      ...newAssetData, 
                      warrantyExpiry: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <SelectItem value="none">No Location</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.locationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assignedTo">Assigned To</Label>
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
                        <SelectItem key={user.uid} value={user.email}>
                          {user.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={newAssetData.purchasePrice}
                  onChange={(e) => setNewAssetData({ ...newAssetData, purchasePrice: e.target.value })}
                  placeholder="Enter purchase price..."
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newAssetData.notes}
                  onChange={(e) => setNewAssetData({ ...newAssetData, notes: e.target.value })}
                  placeholder="Enter any additional notes..."
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Asset
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Asset Dialog */}
      {isEditDialogOpen && selectedAsset && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Asset</DialogTitle>
              <DialogDescription>
                Update the details for this asset.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Asset Name</Label>
                  <Input
                    id="edit-name"
                    value={editAssetData.name}
                    onChange={(e) => setEditAssetData({ ...editAssetData, name: e.target.value })}
                    placeholder="Enter asset name..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type">Asset Type</Label>
                  <Select
                    value={editAssetData.type}
                    onValueChange={(value) => setEditAssetData({ ...editAssetData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editAssetData.type === "Other" && (
                <div>
                  <Label htmlFor="edit-customType">Custom Asset Type</Label>
                  <Input
                    id="edit-customType"
                    value={editAssetData.customType}
                    onChange={(e) => setEditAssetData({ ...editAssetData, customType: e.target.value })}
                    placeholder="Enter custom asset type&hellip;"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-serialNumber">Serial Number</Label>
                  <Input
                    id="edit-serialNumber"
                    value={editAssetData.serialNumber}
                    onChange={(e) => setEditAssetData({ ...editAssetData, serialNumber: e.target.value })}
                    placeholder="Enter serial number&hellip;"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-condition">Condition</Label>
                  <Select
                    value={editAssetData.condition}
                    onValueChange={(value) => setEditAssetData({ ...editAssetData, condition: value as Asset['condition'] })}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-model">Model</Label>
                  <Input
                    id="edit-model"
                    value={editAssetData.model}
                    onChange={(e) => setEditAssetData({ ...editAssetData, model: e.target.value })}
                    placeholder="Enter model..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                  <Input
                    id="edit-manufacturer"
                    value={editAssetData.manufacturer}
                    onChange={(e) => setEditAssetData({ ...editAssetData, manufacturer: e.target.value })}
                    placeholder="Enter manufacturer..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-purchaseDate">Purchase Date</Label>
                  <Input
                    id="edit-purchaseDate"
                    type="date"
                    value={editAssetData.purchaseDate ? editAssetData.purchaseDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditAssetData({ 
                      ...editAssetData, 
                      purchaseDate: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-warrantyExpiry">Warranty Expiry</Label>
                  <Input
                    id="edit-warrantyExpiry"
                    type="date"
                    value={editAssetData.warrantyExpiry ? editAssetData.warrantyExpiry.toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditAssetData({ 
                      ...editAssetData, 
                      warrantyExpiry: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-location">Location</Label>
                  <Select
                    value={editAssetData.locationId}
                    onValueChange={(value) => setEditAssetData({ ...editAssetData, locationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Location</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.locationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-assignedTo">Assigned To</Label>
                  <Select
                    value={editAssetData.assignedToId}
                    onValueChange={(value) => setEditAssetData({ ...editAssetData, assignedToId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.uid} value={user.email}>
                          {user.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-purchasePrice">Purchase Price</Label>
                <Input
                  id="edit-purchasePrice"
                  type="number"
                  step="0.01"
                  value={editAssetData.purchasePrice}
                  onChange={(e) => setEditAssetData({ ...editAssetData, purchasePrice: e.target.value })}
                  placeholder="Enter purchase price..."
                />
              </div>

              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editAssetData.notes}
                  onChange={(e) => setEditAssetData({ ...editAssetData, notes: e.target.value })}
                  placeholder="Enter any additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditAsset} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Update Asset
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Asset Confirmation Dialog */}
      {isDeleteDialogOpen && selectedAsset && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Asset</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedAsset.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAsset}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Asset
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}