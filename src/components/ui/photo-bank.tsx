"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePhotoBank } from '@/context/photo-bank-context';
import { 
  Image as ImageIcon, 
  Search, 
  Download,
  X,
  Trash2, 
  Grid3X3,
  List,
  Tag,
  Link as LinkIcon
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PhotoBankProps {
  className?: string;
  showFilters?: boolean;
  viewMode?: 'grid' | 'list';
  availableQuestions?: Array<{ id: string; label: string; photoUpload: boolean }>;
}

const UNASSIGNED_VALUE = 'unassigned';

export function PhotoBank({ 
  className, 
  showFilters = true, 
  viewMode: initialViewMode = 'grid',
  availableQuestions = []
}: PhotoBankProps) {
  const {
    state: { selectedPhotos },
    selectPhoto,
    deselectPhoto,
    clearSelection,
    removePhoto,
    updatePhoto,
    getAllPhotos,
  } = usePhotoBank();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [filterQuestionId, setFilterQuestionId] = useState<string>('all');
  const [filterAssignmentId, setFilterAssignmentId] = useState<string>('all');

  // Get all photos from the global state
  const photoArray = getAllPhotos();

  // Extract unique assignment and question IDs from all photos for filter dropdowns
  const uniqueAssignmentIds = useMemo(() => Array.from(new Set(photoArray.map(p => p.assignmentId).filter(Boolean))) as string[], [photoArray]);
  const uniqueQuestionIds = useMemo(() => Array.from(new Set(photoArray.map(p => p.questionId).filter(Boolean))) as string[], [photoArray]);

  // Filter photos based on search and filter criteria
  const filteredPhotos = photoArray.filter(photo => {
    const matchesSearch = photo.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = (filterQuestionId === 'all' || photo.questionId === filterQuestionId) &&
                          (filterAssignmentId === 'all' || photo.assignmentId === filterAssignmentId);

    return matchesSearch && matchesFilter;
  });

  // Get questions that support photo upload
  const availableQuestionsForAssignment = availableQuestions.filter(q => q.photoUpload);

  const handlePhotoClick = (photoId: string) => {
    if (selectedPhotos.includes(photoId)) {
      deselectPhoto(photoId);
    } else {
      selectPhoto(photoId);
    }
  };

  const handleDeleteSelected = () => {
    selectedPhotos.forEach(photoId => {
      const photo = photoArray.find(p => p.id === photoId);
      if (photo?.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
      removePhoto(photoId);
    });
    clearSelection();
  };

  const handleDownloadSelected = () => {
    selectedPhotos.forEach(photoId => {
      const photo = photoArray.find(p => p.id === photoId);
      if (photo) {
        const link = document.createElement('a');
        link.href = photo.url;
        link.download = photo.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const handleAssignToQuestion = () => {
    if (selectedPhotos.length === 0 || !selectedQuestionId) return;
    
    selectedPhotos.forEach(photoId => {
      updatePhoto(photoId, { questionId: selectedQuestionId });
    });
    
    setIsAssignDialogOpen(false);
    setSelectedQuestionId('');
    clearSelection();
  };

  const handleUnassignSelected = () => {
    selectedPhotos.forEach(photoId => {
      updatePhoto(photoId, { questionId: undefined });
    });
    clearSelection();
  };

  const handlePhotoAssignmentChange = (photoId: string, questionId: string) => {
    const newQuestionId = questionId === UNASSIGNED_VALUE ? undefined : questionId;
    updatePhoto(photoId, { questionId: newQuestionId });
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Photo Bank
              </CardTitle>
              <CardDescription>
                Manage all photos from assignments and questions ({filteredPhotos.length} total)
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex border rounded-md">
                <Button
                  type="button"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters and Search */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search photos by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterQuestionId} onValueChange={setFilterQuestionId}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by Question" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Questions</SelectItem>
                  {uniqueQuestionIds.map(qId => (
                    <SelectItem key={qId} value={qId}>
                      Question: {qId.substring(0, 8)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterAssignmentId} onValueChange={setFilterAssignmentId}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignments</SelectItem>
                  {uniqueAssignmentIds.map(aId => (
                    <SelectItem key={aId} value={aId}>
                      Assignment: {aId.substring(0, 8)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selection Actions */}
          {selectedPhotos.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">
                {selectedPhotos.length} photo(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignDialogOpen(true)}
                >
                  <Tag className="h-4 w-4 mr-1" />
                  Assign to Question
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUnassignSelected}
                >
                  <X className="h-4 w-4 mr-1" />
                  Unassign
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSelected}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Photo Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={cn(
                    "relative overflow-hidden cursor-pointer transition-all hover:shadow-md",
                    selectedPhotos.includes(photo.id) && "ring-2 ring-primary"
                  )}
                  onClick={() => handlePhotoClick(photo.id)}
                >
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <Image
                      src={photo.url}
                      alt={photo.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant={photo.status === 'uploaded' ? 'default' : 
                               photo.status === 'uploading' ? 'secondary' : 'destructive'}
                    >
                      {photo.status}
                    </Badge>
                  </div>

                  {/* Assignment Status */}
                  {photo.questionId && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        <LinkIcon className="w-2 h-2 mr-1" />
                        Assigned
                      </Badge>
                    </div>
                  )}

                  {/* Selection Indicator */}
                  {selectedPhotos.includes(photo.id) && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                  )}
                  
                  {/* Question Assignment Dropdown - Positioned at lower 20% */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2">
                    <div className="space-y-1">
                      <p className="text-xs text-white truncate">{photo.name}</p>
                      <p className="text-xs text-white/70">
                        {format(photo.uploadedAt, 'MMM d, yyyy')}
                      </p>
                      
                      {/* Assignment Dropdown */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select 
                          value={photo.questionId || UNASSIGNED_VALUE}
                          onValueChange={(value) => handlePhotoAssignmentChange(photo.id, value)}
                        >
                          <SelectTrigger className="h-6 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                            {availableQuestionsForAssignment.map(question => (
                              <SelectItem key={question.id} value={question.id}>
                                {question.label || `Question ${question.id.substring(0, 8)}...`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {photo.assignmentId && (
                        <div className="flex items-center gap-1 mt-1">
                          <LinkIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            A: {photo.assignmentId.substring(0, 8)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-sm",
                    selectedPhotos.includes(photo.id) && "ring-2 ring-primary"
                  )}
                  onClick={() => handlePhotoClick(photo.id)}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <Image
                            src={photo.url}
                            alt={photo.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{photo.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(photo.uploadedAt, 'PPP')}
                          </p>
                          {photo.assignmentId && (
                            <p className="text-xs text-muted-foreground">
                              Assignment: {photo.assignmentId.substring(0, 8)}...
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={photo.status === 'uploaded' ? 'default' : 
                                     photo.status === 'uploading' ? 'secondary' : 'destructive'}
                          >
                            {photo.status}
                          </Badge>
                          
                          {/* Assignment Dropdown for List View */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select 
                              value={photo.questionId || UNASSIGNED_VALUE}
                              onValueChange={(value) => handlePhotoAssignmentChange(photo.id, value)}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                                {availableQuestionsForAssignment.map(question => (
                                  <SelectItem key={question.id} value={question.id}>
                                    {question.label || `Q: ${question.id.substring(0, 8)}...`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign to Question Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Photos to Question</DialogTitle>
            <DialogDescription>
              Select a question to assign the selected photos to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Select value={selectedQuestionId} onValueChange={setSelectedQuestionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a question..." />
              </SelectTrigger>
              <SelectContent>
                {availableQuestionsForAssignment.map(question => (
                  <SelectItem key={question.id} value={question.id}>
                    {question.label || `Question ${question.id.substring(0, 8)}...`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignToQuestion} disabled={!selectedQuestionId}>
              Assign Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}