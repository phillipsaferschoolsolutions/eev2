"use client";

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePhotoBank, type PhotoItem } from '@/hooks/use-photo-bank';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
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
  maxPhotos = 5,
  onPhotosChange,
}: QuestionPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  
  const {
    addPhoto,
    updatePhoto,
    removePhoto,
    getPhotosForQuestion,
    isUploading,
    uploadProgress,
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

      addPhoto(newPhoto);
      simulateUpload(photoId, file);
    });
  };

  const simulateUpload = async (photoId: string, file: File) => {
    setUploading(true);
    
    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        updatePhoto(photoId, { progress });
        setUploadProgress(progress);
      }

      // Mark as uploaded
      updatePhoto(photoId, { 
        status: 'uploaded',
        progress: 100,
      });

      // Notify parent component
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
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemovePhoto = (photoId: string) => {
    const photo = questionPhotos.find(p => p.id === photoId);
    if (photo?.url.startsWith('blob:')) {
      URL.revokeObjectURL(photo.url);
    }
    removePhoto(photoId);
    
    if (onPhotosChange) {
      const updatedPhotos = getPhotosForQuestion(questionId);
      onPhotosChange(updatedPhotos);
    }
  };

  const canAddMore = questionPhotos.length < maxPhotos;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      {canAddMore && (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors cursor-pointer",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            isUploading && "pointer-events-none opacity-50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <Camera className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Upload Photos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop images here, or click to browse
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={isUploading}>
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {questionPhotos.length}/{maxPhotos} photos • Max 10MB per file
            </p>
          </CardContent>
        </Card>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Photo Grid */}
      {questionPhotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {questionPhotos.map((photo) => (
            <Card key={photo.id} className="relative overflow-hidden">
              <div className="aspect-square relative">
                <Image
                  src={photo.url}
                  alt={photo.name}
                  fill
                  className="object-cover"
                />
                
                {/* Status Overlay */}
                {photo.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs">{photo.progress}%</p>
                    </div>
                  </div>
                )}
                
                {photo.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <X className="w-6 h-6 mx-auto mb-1" />
                      <p className="text-xs">Failed</p>
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-6 h-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto(photo.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              
              <CardContent className="p-2">
                <p className="text-xs truncate" title={photo.name}>
                  {photo.name}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ImageIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {photo.status === 'uploaded' ? 'Uploaded' : 
                     photo.status === 'uploading' ? 'Uploading...' : 
                     'Error'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Photos State */}
      {questionPhotos.length === 0 && !canAddMore && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No photos uploaded yet</p>
        </div>
      )}
    </div>
  );
}