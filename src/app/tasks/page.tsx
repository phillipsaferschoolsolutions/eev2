@@ .. @@
 "use client";
 
-import { useEffect, useState } from "react";
+import { useEffect, useState, useCallback } from "react";
 import { useAuth } from "@/context/auth-context";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
@@ .. @@
 import { useToast } from "@/hooks/use-toast";
-import { getMyTasks, createTask, getIssueTypes, type Task, type IssueType } from "@/services/taskService";
+import { getMyTasks, createTask, getIssueTypes, closeTasks, deleteTasks } from "@/services/taskService";
+import type { Task, IssueType } from "@/types/Task";
 import { getLocationsForLookup, type Location } from "@/services/locationService";
-import { getUsersForAccount, type ChatUser } from "@/services/messagingService";
+import { getUsersForAccount } from "@/services/messagingService";
import { getUsersForAccount, type ChatUser } from "@/services/messagingService";
import { getMyTasks, createTask, getIssueTypes, closeTasks, deleteTasks, type Task, type IssueType } from "@/services/taskService";
+  ListTodo, Plus, Search, Edit, Trash2, AlertTriangle, Loader2, 
+  CheckCircle2, Clock, AlertCircle, User, MapPin, Tag, X, Check
 } from "lucide-react";
+import { formatDisplayDateShort } from "@/lib/utils";
 
 export default function TasksPage() {
   const { user, userProfile, loading: authLoading } = useAuth();
   const { toast } = useToast();
   
   // State for tasks
-  const [tasks, setTasks] = useState<Task[]>([]);
+  const [tasks, setTasks] = useState<any[]>([]);
+  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
   const [isLoadingTasks, setIsLoadingTasks] = useState(true);
   const [tasksError, setTasksError] = useState<string | null>(null);
   
@@ .. @@
   const [searchTerm, setSearchTerm] = useState("");
   
   // State for create task dialog
   const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
   const [isCreating, setIsCreating] = useState(false);
   const [newTaskData, setNewTaskData] = useState({
-    title: "",
+    taskTitle: "",
     description: "",
-    priority: "Medium" as Task['priority'],
-    issueTypeId: "",
+    priority: "Medium",
+    issueType: "",
     locationId: "",
-    assigneeId: "",
+    assignedToUserId: "",
   });
   
+  // State for task actions
+  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
+  const [isPerformingAction, setIsPerformingAction] = useState(false);
+  
   // Fetch tasks when component mounts
   useEffect(() => {
     if (!authLoading && userProfile?.account && user?.email) {
@@ -48,7 +58,7 @@ export default function TasksPage() {
   }, [userProfile?.account, authLoading, user?.email]);
   
   // Function to fetch tasks
-  const fetchTasks = async () => {
+  const fetchTasks = useCallback(async () => {
     if (!userProfile?.account || !user?.email) return;
     
     setIsLoadingTasks(true);
@@ -56,8 +66,9 @@ export default function TasksPage() {
     
     try {
-      const fetchedTasks = await getMyTasks();
-      setTasks(fetchedTasks);
+      const result = await getMyTasks("Open");
+      setTasks(result.tasks || []);
+      setTaskCounts(result.counts || {});
     } catch (error) {
       console.error("Failed to fetch tasks:", error);
       setTasksError("Failed to load tasks. Please try again.");
@@ -65,7 +76,7 @@ export default function TasksPage() {
     } finally {
       setIsLoadingTasks(false);
     }
-  };
+  }, [userProfile?.account, user?.email, toast]);
   
   // Fetch issue types
   useEffect(() => {
@@ -102,7 +113,7 @@ export default function TasksPage() {
   
   // Function to handle creating a new task
   const handleCreateTask = async () => {
-    if (!newTaskData.title.trim()) {
+    if (!newTaskData.taskTitle.trim()) {
       toast({ variant: "destructive", title: "Validation Error", description: "Task title is required." });
       return;
     }
@@ -112,14 +123,13 @@ export default function TasksPage() {
     
     try {
       await createTask({
-        title: newTaskData.title,
+        taskTitle: newTaskData.taskTitle,
         description: newTaskData.description,
         priority: newTaskData.priority,
-        status: "Open",
-        issueTypeId: newTaskData.issueTypeId,
+        issueType: newTaskData.issueType,
         locationId: newTaskData.locationId,
-        assigneeId: newTaskData.assigneeId,
-        accountId: userProfile.account,
+        assignedToUserId: newTaskData.assignedToUserId,
+        status: "Open",
       });
       
       toast({ title: "Success", description: "Task created successfully." });
@@ -127,7 +137,7 @@ export default function TasksPage() {
       setIsCreateDialogOpen(false);
       
       // Reset form
-      setNewTaskData({ title: "", description: "", priority: "Medium", issueTypeId: "", locationId: "", assigneeId: "" });
+      setNewTaskData({ taskTitle: "", description: "", priority: "Medium", issueType: "", locationId: "", assignedToUserId: "" });
       
       // Refresh tasks
       fetchTasks();
@@ -139,6 +149,50 @@ export default function TasksPage() {
     }
   };
   
+  // Function to close selected tasks
+  const handleCloseTasks = async () => {
+    if (selectedTasks.length === 0) return;
+    
+    setIsPerformingAction(true);
+    try {
+      await closeTasks(selectedTasks);
+      toast({ title: "Success", description: `${selectedTasks.length} task(s) closed successfully.` });
+      setSelectedTasks([]);
+      fetchTasks();
+    } catch (error) {
+      console.error("Failed to close tasks:", error);
+      toast({ variant: "destructive", title: "Error", description: "Failed to close tasks." });
+    } finally {
+      setIsPerformingAction(false);
+    }
+  };
+  
+  // Function to delete selected tasks
+  const handleDeleteTasks = async () => {
+    if (selectedTasks.length === 0) return;
+    
+    setIsPerformingAction(true);
+    try {
+      await deleteTasks(selectedTasks);
+      toast({ title: "Success", description: `${selectedTasks.length} task(s) deleted successfully.` });
+      setSelectedTasks([]);
+      fetchTasks();
+    } catch (error) {
+      console.error("Failed to delete tasks:", error);
+      toast({ variant: "destructive", title: "Error", description: "Failed to delete tasks." });
+    } finally {
+      setIsPerformingAction(false);
+    }
+  };
+  
+  // Function to toggle task selection
+  const toggleTaskSelection = (taskId: string) => {
+    setSelectedTasks(prev => 
+      prev.includes(taskId) 
+        ? prev.filter(id => id !== taskId)
+        : [...prev, taskId]
+    );
+  };
+  
   // Filter tasks based on search term
   const filteredTasks = tasks.filter(task =>
-    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
+    (task.taskTitle || task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
     task.description?.toLowerCase().includes(searchTerm.toLowerCase())
   );
@@ .. @@
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
           <p className="text-lg text-muted-foreground">
-            Manage and track tasks for your organization.
+            Manage and track tasks for account: {userProfile?.account || "Loading..."}
           </p>
         </div>
-        <Button onClick={() => setIsCreateDialogOpen(true)}>
-          <Plus className="mr-2 h-4 w-4" /> Create Task
-        </Button>
+        <div className="flex gap-2">
+          {selectedTasks.length > 0 && (
+            <>
+              <Button 
+                variant="outline" 
+                onClick={handleCloseTasks}
+                disabled={isPerformingAction}
+              >
+                <Check className="mr-2 h-4 w-4" />
+                Close ({selectedTasks.length})
+              </Button>
+              <Button 
+                variant="destructive" 
+                onClick={handleDeleteTasks}
+                disabled={isPerformingAction}
+              >
+                <Trash2 className="mr-2 h-4 w-4" />
+                Delete ({selectedTasks.length})
+              </Button>
+            </>
+          )}
+          <Button onClick={() => setIsCreateDialogOpen(true)}>
+            <Plus className="mr-2 h-4 w-4" /> Create Task
+          </Button>
+        </div>
       </div>
       
+      {/* Task counts */}
+      {Object.keys(taskCounts).length > 0 && (
+        <div className="flex gap-4">
+          {Object.entries(taskCounts).map(([status, count]) => (
+            <div key={status} className="text-sm">
+              <span className="font-medium">{status}:</span> {count}
+            </div>
+          ))}
+        </div>
+      )}
+      
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
@@ -179,6 +233,7 @@ export default function TasksPage() {
               <TableHeader>
                 <TableRow>
+                  <TableHead className="w-12">Select</TableHead>
                   <TableHead>Title</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Priority</TableHead>
@@ .. @@
               <TableBody>
                 {filteredTasks.map((task) => (
                   <TableRow key={task.id}>
+                    <TableCell>
+                      <Checkbox
+                        checked={selectedTasks.includes(task.id)}
+                        onCheckedChange={() => toggleTaskSelection(task.id)}
+                      />
+                    </TableCell>
                     <TableCell className="font-medium">
-                      {task.title}
+                      {task.taskTitle || task.title || 'Untitled Task'}
                       {task.description && (
                         <p className="text-sm text-muted-foreground truncate max-w-xs">
                           {task.description}
@@ -188,7 +243,7 @@ export default function TasksPage() {
                     </TableCell>
                     <TableCell>
                       <Badge variant={
-                        task.status === 'Open' ? 'default' :
+                        task.status === 'Open' ? 'secondary' :
                         task.status === 'In Progress' ? 'default' :
                         task.status === 'Resolved' ? 'default' :
                         'outline'
@@ -198,7 +253,7 @@ export default function TasksPage() {
                     </TableCell>
                     <TableCell>
                       <Badge variant={
-                        task.priority === 'Critical' ? 'destructive' :
+                        task.priority === 'Critical' || task.priority === 'High' ? 'destructive' :
                         task.priority === 'High' ? 'destructive' :
                         task.priority === 'Medium' ? 'default' :
                         'secondary'
@@ -208,13 +263,13 @@ export default function TasksPage() {
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-1">
                         <Tag className="h-3 w-3 text-muted-foreground" />
-                        {task.issueTypeName || 'N/A'}
+                        {task.issueType || 'N/A'}
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-1">
                         <MapPin className="h-3 w-3 text-muted-foreground" />
                         {task.locationName || 'N/A'}
                       </div>
                     </TableCell>
@@ .. @@
                     <TableCell>
                       <div className="flex items-center gap-1">
                         <User className="h-3 w-3 text-muted-foreground" />
-                        {task.assigneeName || 'Unassigned'}
+                        {task.assignedToUserId || 'Unassigned'}
                       </div>
                     </TableCell>
+                    <TableCell>
+                      {task.createdTime ? formatDisplayDateShort(task.createdTime) : 'N/A'}
+                    </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <Button variant="outline" size="sm">
@@ .. @@
             <div className="space-y-4">
               <div>
-                <Label htmlFor="title">Task Title</Label>
+                <Label htmlFor="taskTitle">Task Title</Label>
                 <Input
-                  id="title"
-                  value={newTaskData.title}
-                  onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
+                  id="taskTitle"
+                  value={newTaskData.taskTitle}
+                  onChange={(e) => setNewTaskData({ ...newTaskData, taskTitle: e.target.value })}
                   placeholder="Enter task title..."
                 />
               </div>
@@ .. @@
               <div>
-                <Label htmlFor="issueType">Issue Type</Label>
+                <Label htmlFor="issueType">Issue Type</Label>
                 <Select
-                  value={newTaskData.issueTypeId}
-                  onValueChange={(value) => setNewTaskData({ ...newTaskData, issueTypeId: value })}
+                  value={newTaskData.issueType}
+                  onValueChange={(value) => setNewTaskData({ ...newTaskData, issueType: value })}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select issue type" />
@@ .. @@
                   <SelectContent>
                     {issueTypes.map((type) => (
-                      <SelectItem key={type.id} value={type.id}>
+                      <SelectItem key={type.id} value={type.name}>
                         {type.name}
                       </SelectItem>
                     ))}
@@ .. @@
               <div>
-                <Label htmlFor="assignee">Assignee</Label>
+                <Label htmlFor="assignee">Assignee</Label>
                 <Select
-                  value={newTaskData.assigneeId}
-                  onValueChange={(value) => setNewTaskData({ ...newTaskData, assigneeId: value })}
+                  value={newTaskData.assignedToUserId}
+                  onValueChange={(value) => setNewTaskData({ ...newTaskData, assignedToUserId: value })}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select assignee" />
@@ .. @@
                   <SelectContent>
+                    <SelectItem value="Assign to me">Assign to me</SelectItem>
                     {users.map((user) => (
-                      <SelectItem key={user.uid} value={user.uid}>
+                      <SelectItem key={user.uid} value={user.email}>
                         {user.displayName}
                       </SelectItem>
                     ))}
@@ .. @@
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