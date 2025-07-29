```
tsx
```
"use client";

import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePhotoBank } from '@/context/photo-bank-context';
import type { PhotoItem } from '@/context/photo-bank-context';
import { Camera, Upload, X, Eye } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface QuestionPhotoUploadProps {
  questionId: string;
  assignmentId?: string;
  className?: string;
  maxPhotos?: number;
  onPhotosChange?: (photos: PhotoItem[]) => void;
}

export function QuestionPhotoUpload({ 
  questionId,
  assignmentId,
  className, 
  maxPhotos = 3,
  onPhotosChange,
}: QuestionPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedPhotoForModal, setSelectedPhotoForModal] = useState<PhotoItem | null>(null);
  
  const { 
    addPhoto,
    updatePhoto,
    removePhoto,
    getPhotosForQuestion,
    state: { isUploading, uploadProgress },
    setUploading, 
    setUploadProgress,
  } = usePhotoBank();

  const questionPhotos = getPhotosForQuestion(questionId);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const remainingSlots = maxPhotos - questionPhotos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        console.warn('Only image files are allowed');
        return;
      } 

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        console.warn('File size must be less than 10MB');
        return;
      }

      const photoId = `${questionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const photoUrl = URL.createObjectURL(file); 

      const newPhoto: PhotoItem = {
        id: photoId,
        file,
        url: photoUrl,
        name: file.name,
        uploadedAt: new Date(),
        questionId,
        assignmentId,
        status: 'uploading',
        progress: 0, 
      };

      addPhoto(newPhoto); // Dispatch to global state
      simulateUpload(photoId, file);
    });
  };
  
  const simulateUpload = async (photoId: string, file: File) => {
    setUploading(true);
    
    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        updatePhoto(photoId, { progress: progress }); 
        setUploadProgress(progress);
      }

      // Mark as uploaded
      updatePhoto(photoId, { 
        status: 'uploaded',
        progress: 100,
      }); 

      // Notify parent component (if needed, though global state is primary)
      if (onPhotosChange) {
        const updatedPhotos = getPhotosForQuestion(questionId);
        onPhotosChange(updatedPhotos);
      }
    } catch (error) {
      updatePhoto(photoId, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed', 
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => { 
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true); 
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };
  
  const handleRemovePhoto = (e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const photo = questionPhotos.find(p => p.id === photoId);
    if (photo?.url.startsWith('blob:')) {
      URL.revokeObjectURL(photo.url);
    }
    removePhoto(photoId); // Dispatch to global state
    
    if (onPhotosChange) {
      const updatedPhotos = getPhotosForQuestion(questionId);
      onPhotosChange(updatedPhotos);
    }
  }; 

  const handleChooseFiles = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handlePhotoClick = (e: React.MouseEvent, photo: PhotoItem) => { 
    e.preventDefault();
    e.stopPropagation();
    setSelectedPhotoForModal(photo);
  };

  const canAddMore = questionPhotos.length < maxPhotos;

  return (
    <div className={cn("space-y-1", className)}>
      {/* Compact Upload Area */}
      {canAddMore && ( 
        <div
          className={cn(
            "border border-dashed rounded p-2 transition-colors cursor-pointer text-center text-xs",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isUploading && "pointer-events-none opacity-50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave} // Corrected to handleDragLeave
          onClick={handleChooseFiles}
        >
          <div className="flex flex-col items-center space-y-1">
            <Camera className="w-4 h-4 text-muted-foreground" /> 
            <p className="text-sm font-medium">Upload Photos</p>
            <p className="text-xs text-muted-foreground text-center">
              Drag & drop or click
            </p>
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              disabled={isUploading} 
              onClick={handleChooseFiles} // Corrected to handleChooseFiles
              className="h-5 text-xs px-2 py-0"
            >
              <Upload className="w-2 h-2 mr-1" />
              Choose Files
            </Button>
            <p className="text-xs text-muted-foreground">
              {questionPhotos.length}/{maxPhotos} photos
            </p>
          </div>
        </div>
      )}
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={isUploading}
      />
      
      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1" />
        </div>
      )} 

      {/* Compact Photo Grid */}
      {questionPhotos.length > 0 && (
        <div className="grid grid-cols-5 gap-1">
          {questionPhotos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div 
                className="aspect-square relative border rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handlePhotoClick(e, photo)}
              >
                <Image
                  src={photo.url}
                  alt={photo.name}
                  fill
                  className="object-cover"
                />
                
                {/* Status Overlay */}
                {photo.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center text-xs">
                      <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                      <p className="text-xs">{photo.progress}%</p>
                    </div>
                  </div>
                )}
                
                {photo.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                    <X className="w-2 h-2 text-white" />
                  </div>
                )}

                {/* View Icon */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <Eye className="w-4 h-4 text-white" />
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  className="absolute top-0 right-0 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-xs p-0"
                  onClick={(e) => handlePhotoClick(e, photo)}
                >
                  <X className="w-2 h-2" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      <Dialog open={!!selectedPhotoForModal} onOpenChange={() => setSelectedPhotoForModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPhotoForModal?.name}</DialogTitle>
          </DialogHeader>
          {selectedPhotoForModal && (
            <div className="relative w-full h-96">
              <Image
                src={selectedPhotoForModal.url}
                alt={selectedPhotoForModal.name}
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}