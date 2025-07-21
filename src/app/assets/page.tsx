"use client";

import { useEffect, useState, useCallback } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { getAssets, createAsset, type Asset } from "@/services/assetService";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { getUsersForAccount, type ChatUser } from "@/services/messagingService";
import { DatePicker } from "@/components/ui/date-picker";
import { 
  HardDrive, Plus, Search, Edit, Trash2, AlertTriangle, Loader2, 
  Package, MapPin, User, Calendar, Building, Hash, Wrench
} from "lucide-react";
import { formatDisplayDateShort } from "@/lib/utils";

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
  
  // State for search
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for create dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
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
    serialNumber: "",
    model: "",
    manufacturer: "",
    condition: "Good" as Asset['condition'],
    locationId: "",
    assignedToId: "", 
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
  
  // Handle creating new asset
  const handleCreateAsset = async () => {
    if (!userProfile?.account) return;
    
    setIsCreating(true);
    
    try {
      await createAsset({
        name: newAssetData.name,
        type: newAssetData.type,
        serialNumber: newAssetData.serialNumber,
        model: newAssetData.model,
        manufacturer: newAssetData.manufacturer,
        condition: newAssetData.condition,
        locationId: newAssetData.locationId,
        assignedToId: newAssetData.assignedToId,
        notes: newAssetData.notes,
        purchaseDate: newAssetData.purchaseDate,
        warrantyExpiry: newAssetData.warrantyExpiry,
        account: userProfile.account
      });
      
      // Reset form
      setNewAssetData({
        name: "", type: "", serialNumber: "", condition: "Good",
        model: "", manufacturer: "", locationId: "", assignedToId: "", notes: "",
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
                    <TableHead>Created</TableHead>
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
                        {asset.createdAt ? formatDisplayDateShort(asset.createdAt) : 'N/A'}
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
          <DialogContent className="max-w-2xl">
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
                <Input
                  id="type"
                  value={newAssetData.type}
                  onChange={(e) => setNewAssetData({ ...newAssetData, type: e.target.value })}
                  placeholder="e.g., Computer, Printer, Camera..."
                />
              </div>
              
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
                    <SelectItem value="">Unassigned</SelectItem>
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
    </div>
  );
}