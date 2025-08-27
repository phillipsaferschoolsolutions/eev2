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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ListTodo, Plus, Search, Edit, Trash2, AlertTriangle, Loader2, 
  User, MapPin, Tag, Check,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMyTasks, createTask, updateTask, deleteTask, getIssueTypes, closeTasks, deleteTasks } from "@/services/taskService";
import type { Task, IssueType } from "@/types/Task";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { getUsersForAccount } from "@/services/messagingService";
import type { ChatUser } from "@/types/Message";
import { formatDisplayDateShort } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePersistedState } from "@/hooks/use-persisted-state";

export default function TasksPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // State for tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  
  // State for issue types
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingIssueTypes, setIsLoadingIssueTypes] = useState(false);
  
  // State for locations
  const [locations, setLocations] = useState<Location[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  
  // State for users
  const [users, setUsers] = useState<ChatUser[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for create task dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // State for edit task dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // State for delete task dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [newTaskData, setNewTaskData] = useState({
    taskTitle: "",
    description: "",
    priority: "Medium",
    issueType: "",
    locationId: "",
    assignedToUserId: "",
  });
  
  const [editTaskData, setEditTaskData] = useState({
    taskTitle: "",
    description: "",
    priority: "Medium",
    issueType: "",
    locationId: "",
    assignedToUserId: "",
    status: "Open",
  });
  
  // State for task actions
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  
  // State for pagination
  const [currentPage, setCurrentPage] = usePersistedState('tasks-current-page', 1);
  const [itemsPerPage, setItemsPerPage] = usePersistedState('tasks-items-per-page', 10);
  
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
  
  // Fetch tasks when component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account && user?.email) {
      fetchTasks();
    }
  }, [userProfile?.account, authLoading, user?.email, fetchTasks]);
  
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
  
  // Function to open edit task dialog
  const openEditTaskDialog = (task: Task) => {
    setSelectedTask(task);
    setEditTaskData({
      taskTitle: (task as Record<string, unknown>).taskTitle as string || (task as Record<string, unknown>).title as string || "",
      description: task.description || "",
      priority: task.priority || "Medium",
      issueType: task.issueType || "",
      locationId: task.locationId || "",
      assignedToUserId: task.assignedToUserId || "",
      status: task.status || "Open",
    });
    setIsEditDialogOpen(true);
  };
  
  // Function to handle editing a task
  const handleEditTask = async () => {
    if (!selectedTask) return;
    
    setIsUpdating(true);
    
    try {
      await updateTask({
        id: selectedTask.id,
        title: editTaskData.taskTitle,
        description: editTaskData.description,
        priority: editTaskData.priority,
        status: editTaskData.status,
        issueTypeId: editTaskData.issueType,
        locationId: editTaskData.locationId,
        assigneeId: editTaskData.assignedToUserId === "unassigned" ? undefined : editTaskData.assignedToUserId,
      });
      
      toast({ title: "Success", description: "Task updated successfully." });
      
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      
      // Refresh tasks
      fetchTasks();
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update task. Please try again." });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Function to open delete task dialog
  const openDeleteTaskDialog = (task: Task) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };
  
  // Function to handle deleting a single task
  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    
    setIsDeleting(true);
    
    try {
      await deleteTask(selectedTask.id);
      
      toast({ title: "Success", description: "Task deleted successfully." });
      
      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
      
      // Refresh tasks
      fetchTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete task. Please try again." });
    } finally {
      setIsDeleting(false);
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
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Handler for changing items per page
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, setCurrentPage]);

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
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-lg text-muted-foreground break-words">
            Manage and track tasks for account: {userProfile?.account || "Loading..."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {selectedTasks.length > 0 && (
            <>
              <Button 
                variant="outline" 
                onClick={handleCloseTasks}
                disabled={isPerformingAction}
                className="w-full sm:w-auto"
              >
                <Check className="mr-2 h-4 w-4" />
                Close ({selectedTasks.length})
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteTasks}
                disabled={isPerformingAction}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedTasks.length})
              </Button>
            </>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
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
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead className="w-1/2 sm:min-w-[200px]">Title</TableHead>
                    <TableHead className="w-1/4">Status</TableHead>
                    <TableHead className="w-1/4 hidden sm:table-cell">Priority</TableHead>
                    <TableHead className="hidden md:table-cell">Issue Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead className="hidden lg:table-cell">Assignee</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-right w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTasks.includes(task.id)}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="text-sm break-words">
                          {task.taskTitle || task.title || 'Untitled Task'}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
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
                        } className="text-xs">
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={
                          task.priority === 'Critical' || task.priority === 'High' ? 'destructive' :
                          task.priority === 'High' ? 'destructive' :
                          task.priority === 'Medium' ? 'default' :
                          'secondary'
                        } className="text-xs">
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs truncate max-w-[100px]">{task.issueType || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs truncate max-w-[100px]">{task.locationName || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs truncate max-w-[100px]">{task.assignedToUserId || 'Unassigned'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {task.createdTime ? formatDisplayDateShort(task.createdTime) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEditTaskDialog(task)} className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openDeleteTaskDialog(task)} className="h-7 w-7 p-0">
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
          {filteredTasks.length > 0 && (
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
                        {location.locationName}
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
      
      {/* Edit Task Dialog */}
      {isEditDialogOpen && selectedTask && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update the details for this task.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-taskTitle">Task Title</Label>
                <Input
                  id="edit-taskTitle"
                  value={editTaskData.taskTitle}
                  onChange={(e) => setEditTaskData({ ...editTaskData, taskTitle: e.target.value })}
                  placeholder="Enter task title..."
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editTaskData.description}
                  onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                  placeholder="Enter task description..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editTaskData.status}
                  onValueChange={(value) => setEditTaskData({ ...editTaskData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={editTaskData.priority}
                  onValueChange={(value) => setEditTaskData({ ...editTaskData, priority: value })}
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
                <Label htmlFor="edit-issueType">Issue Type</Label>
                <Select
                  value={editTaskData.issueType}
                  onValueChange={(value) => setEditTaskData({ ...editTaskData, issueType: value })}
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
                <Label htmlFor="edit-location">Location</Label>
                <Select
                  value={editTaskData.locationId}
                  onValueChange={(value) => setEditTaskData({ ...editTaskData, locationId: value })}
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
                <Label htmlFor="edit-assignee">Assignee</Label>
                <Select
                  value={editTaskData.assignedToUserId}
                  onValueChange={(value) => setEditTaskData({ ...editTaskData, assignedToUserId: value })}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditTask} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Update Task
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Task Confirmation Dialog */}
      {isDeleteDialogOpen && selectedTask && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{selectedTask.taskTitle || selectedTask.title}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTask}
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
                    Delete Task
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