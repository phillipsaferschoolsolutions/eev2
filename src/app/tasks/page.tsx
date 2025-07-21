"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ListTodo, Plus, Search, Edit, Trash2, AlertTriangle, Loader2, 
  CheckCircle2, Clock, AlertCircle, User, MapPin, Tag, X, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMyTasks, createTask, getIssueTypes, closeTasks, deleteTasks } from "@/services/taskService";
import type { Task, IssueType } from "@/types/Task";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { getUsersForAccount, type ChatUser } from "@/services/messagingService";
import { formatDisplayDateShort } from "@/lib/utils";

export default function TasksPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // State for tasks
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  
  // State for issue types
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [isLoadingIssueTypes, setIsLoadingIssueTypes] = useState(false);
  
  // State for locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  
  // State for users
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for create task dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    taskTitle: "",
    description: "",
    priority: "Medium",
    issueType: "",
    locationId: "",
    assignedToUserId: "",
  });
  
  // State for task actions
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  
  // Fetch tasks when component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account && user?.email) {
      fetchTasks();
    }
  }, [userProfile?.account, authLoading, user?.email]);
  
  // Function to fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!userProfile?.account || !user?.email) return;
    
    setIsLoadingTasks(true);
    setTasksError(null);
    
    try {
      const result = await getMyTasks("Open");
      setTasks(result.tasks || []);
      setTaskCounts(result.counts || {});
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setTasksError("Failed to load tasks. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Failed to load tasks." });
    } finally {
      setIsLoadingTasks(false);
    }
  }, [userProfile?.account, user?.email, toast]);
  
  // Fetch issue types
  useEffect(() => {
    const fetchIssueTypes = async () => {
      setIsLoadingIssueTypes(true);
      try {
        const types = await getIssueTypes();
        setIssueTypes(types);
      } catch (error) {
        console.error("Failed to fetch issue types:", error);
      } finally {
        setIsLoadingIssueTypes(false);
      }
    };
    
    fetchIssueTypes();
  }, []);
  
  // Fetch locations
  useEffect(() => {
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
    
    fetchLocations();
  }, [userProfile?.account]);
  
  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userProfile?.account) return;
      
      setIsLoadingUsers(true);
      try {
        const userList = await getUsersForAccount(userProfile.account);
        setUsers(userList);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, [userProfile?.account]);
  
  // Function to handle creating a new task
  const handleCreateTask = async () => {
    if (!newTaskData.taskTitle.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Task title is required." });
      return;
    }
    
    setIsCreating(true);
    
    try {
      await createTask({
        taskTitle: newTaskData.taskTitle,
        description: newTaskData.description,
        priority: newTaskData.priority,
        issueType: newTaskData.issueType,
        locationId: newTaskData.locationId,
        assignedToUserId: newTaskData.assignedToUserId,
        status: "Open",
      });
      
      toast({ title: "Success", description: "Task created successfully." });
      
      setIsCreateDialogOpen(false);
      
      // Reset form
      setNewTaskData({ taskTitle: "", description: "", priority: "Medium", issueType: "", locationId: "", assignedToUserId: "" });
      
      // Refresh tasks
      fetchTasks();
    } catch (error) {
      console.error("Failed to create task:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create task. Please try again." });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Function to close selected tasks
  const handleCloseTasks = async () => {
    if (selectedTasks.length === 0) return;
    
    setIsPerformingAction(true);
    try {
      await closeTasks(selectedTasks);
      toast({ title: "Success", description: `${selectedTasks.length} task(s) closed successfully.` });
      setSelectedTasks([]);
      fetchTasks();
    } catch (error) {
      console.error("Failed to close tasks:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to close tasks." });
    } finally {
      setIsPerformingAction(false);
    }
  };
  
  // Function to delete selected tasks
  const handleDeleteTasks = async () => {
    if (selectedTasks.length === 0) return;
    
    setIsPerformingAction(true);
    try {
      await deleteTasks(selectedTasks);
      toast({ title: "Success", description: `${selectedTasks.length} task(s) deleted successfully.` });
      setSelectedTasks([]);
      fetchTasks();
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete tasks." });
    } finally {
      setIsPerformingAction(false);
    }
  };
  
  // Function to toggle task selection
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };
  
  // Filter tasks based on search term
  const filteredTasks = tasks.filter(task =>
    (task.taskTitle || task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <p className="text-muted-foreground">You need to be logged in to view tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-lg text-muted-foreground">
            Manage and track tasks for account: {userProfile?.account || "Loading..."}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedTasks.length > 0 && (
            <>
              <Button 
                variant="outline" 
                onClick={handleCloseTasks}
                disabled={isPerformingAction}
              >
                <Check className="mr-2 h-4 w-4" />
                Close ({selectedTasks.length})
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteTasks}
                disabled={isPerformingAction}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedTasks.length})
              </Button>
            </>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Task
          </Button>
        </div>
      </div>
      
      {/* Task counts */}
      {Object.keys(taskCounts).length > 0 && (
        <div className="flex gap-4">
          {Object.entries(taskCounts).map(([status, count]) => (
            <div key={status} className="text-sm">
              <span className="font-medium">{status}:</span> {count}
            </div>
          ))}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            My Tasks
          </CardTitle>
          <CardDescription>
            View and manage your assigned tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          {isLoadingTasks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : tasksError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{tasksError}</p>
              <Button onClick={fetchTasks} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No tasks found matching your search." : "No tasks found."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTasks.includes(task.id)}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {task.taskTitle || task.title || 'Untitled Task'}
                        {task.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {task.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          task.status === 'Open' ? 'secondary' :
                          task.status === 'In Progress' ? 'default' :
                          task.status === 'Resolved' ? 'default' :
                          'outline'
                        }>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          task.priority === 'Critical' || task.priority === 'High' ? 'destructive' :
                          task.priority === 'High' ? 'destructive' :
                          task.priority === 'Medium' ? 'default' :
                          'secondary'
                        }>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {task.issueType || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {task.locationName || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {task.assignedToUserId || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.createdTime ? formatDisplayDateShort(task.createdTime) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm">
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
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      {isCreateDialogOpen && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new task.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="taskTitle">Task Title</Label>
                <Input
                  id="taskTitle"
                  value={newTaskData.taskTitle}
                  onChange={(e) => setNewTaskData({ ...newTaskData, taskTitle: e.target.value })}
                  placeholder="Enter task title..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                  placeholder="Enter task description..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTaskData.priority}
                  onValueChange={(value) => setNewTaskData({ ...newTaskData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="issueType">Issue Type</Label>
                <Select
                  value={newTaskData.issueType}
                  onValueChange={(value) => setNewTaskData({ ...newTaskData, issueType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  value={newTaskData.locationId}
                  onValueChange={(value) => setNewTaskData({ ...newTaskData, locationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={newTaskData.assignedToUserId}
                  onValueChange={(value) => setNewTaskData({ ...newTaskData, assignedToUserId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Assign to me">Assign to me</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.uid} value={user.email}>
                        {user.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
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