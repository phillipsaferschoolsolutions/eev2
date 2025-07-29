"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePhotoBank, type PhotoItem } from '@/hooks/use-photo-bank';
import { 
  Image as ImageIcon, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye,
  Grid3X3,
  List,
  Calendar,
  Tag
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PhotoBankProps {
  className?: string;
  showFilters?: boolean;
  viewMode?: 'grid' | 'list';
}

export function PhotoBank({ 
  className, 
  showFilters = true, 
  viewMode: initialViewMode = 'grid' 
}: PhotoBankProps) {
  const {
    photos,
    selectedPhotos,
    selectPhoto,
    deselectPhoto,
    clearSelection,
    removePhoto,
  } = usePhotoBank();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [filterBy, setFilterBy] = useState<'all' | 'questions' | 'assignments'>('all');

  const photoArray = Object.values(photos);

  // Filter photos based on search and filter criteria
  const filteredPhotos = photoArray.filter(photo => {
    const matchesSearch = photo.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterBy === 'all' ||
      (filterBy === 'questions' && photo.questionId) ||
      (filterBy === 'assignments' && photo.assignmentId);

    return matchesSearch && matchesFilter;
  });

  const handlePhotoClick = (photoId: string) => {
    if (selectedPhotos.includes(photoId)) {
      deselectPhoto(photoId);
    } else {
      selectPhoto(photoId);
    }
  };

  const handleDeleteSelected = () => {
    selectedPhotos.forEach(photoId => {
      const photo = photos[photoId];
      if (photo?.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
      removePhoto(photoId);
    });
    clearSelection();
  };

  const handleDownloadSelected = () => {
    selectedPhotos.forEach(photoId => {
      const photo = photos[photoId];
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
                Manage all photos from assignments and questions
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
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
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={filterBy === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterBy('all')}
                >
                  All Photos
                </Button>
                <Button
                  variant={filterBy === 'questions' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterBy('questions')}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Questions
                </Button>
                <Button
                  variant={filterBy === 'assignments' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterBy('assignments')}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Assignments
                </Button>
              </div>
            </div>
          )}

          {/* Selection Actions */}
          {selectedPhotos.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">
                {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadSelected}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Photo Display */}
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Photos Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No photos match your search criteria.' : 'No photos have been uploaded yet.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredPhotos.map((photo) => (
                <Card
                  key={photo.id}
                  className={cn(
                    "relative overflow-hidden cursor-pointer transition-all hover:shadow-md",
                    selectedPhotos.includes(photo.id) && "ring-2 ring-primary"
                  )}
                  onClick={() => handlePhotoClick(photo.id)}
                >
                  <div className="aspect-square relative">
                    <Image
                      src={photo.url}
                      alt={photo.name}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Status Badge */}
                    <Badge
                      variant={photo.status === 'uploaded' ? 'default' : 
                               photo.status === 'uploading' ? 'secondary' : 'destructive'}
                      className="absolute top-2 left-2 text-xs"
                    >
                      {photo.status}
                    </Badge>

                    {/* Selection Indicator */}
                    {selectedPhotos.includes(photo.id) && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Eye className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-2">
                    <p className="text-xs truncate font-medium" title={photo.name}>
                      {photo.name}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(photo.uploadedAt, 'MMM d')}
                      </span>
                    </div>
                    {photo.questionId && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">
                          Q: {photo.questionId.slice(-8)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPhotos.map((photo) => (
                <Card
                  key={photo.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-sm",
                    selectedPhotos.includes(photo.id) && "ring-2 ring-primary"
                  )}
                  onClick={() => handlePhotoClick(photo.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 relative rounded-md overflow-hidden flex-shrink-0">
                        <Image
                          src={photo.url}
                          alt={photo.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{photo.name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{format(photo.uploadedAt, 'MMM d, yyyy')}</span>
                          {photo.questionId && (
                            <span>Question: {photo.questionId.slice(-8)}</span>
                          )}
                          {photo.assignmentId && (
                            <span>Assignment: {photo.assignmentId.slice(-8)}</span>
                          )}
                        </div>
                      </div>
                      
                      <Badge
                        variant={photo.status === 'uploaded' ? 'default' : 
                                 photo.status === 'uploading' ? 'secondary' : 'destructive'}
                      >
                        {photo.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}