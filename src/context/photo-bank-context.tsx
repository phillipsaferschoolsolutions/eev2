"use client";

import React, { createContext, useContext, useReducer, useCallback } from 'react';

export interface PhotoItem {
  id: string;
  file?: File;
  url: string;
  name: string;
  uploadedAt: Date;
  questionId?: string; // Links photo to specific question
  assignmentId?: string; // Links photo to specific assignment
  status: 'uploading' | 'uploaded' | 'error';
  progress?: number;
  error?: string;
}

interface PhotoBankState {
  photos: Record<string, PhotoItem>;
  selectedPhotos: string[];
  isUploading: boolean;
  uploadProgress: number;
}

type PhotoBankAction =
  | { type: 'ADD_PHOTO'; payload: PhotoItem }
  | { type: 'UPDATE_PHOTO'; payload: { id: string; updates: Partial<PhotoItem> } }
  | { type: 'REMOVE_PHOTO'; payload: string }
  | { type: 'SELECT_PHOTO'; payload: string }
  | { type: 'DESELECT_PHOTO'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: number }
  | { type: 'CLEAR_PHOTOS' };

const initialState: PhotoBankState = {
  photos: {},
  selectedPhotos: [],
  isUploading: false,
  uploadProgress: 0,
};

function photoBankReducer(state: PhotoBankState, action: PhotoBankAction): PhotoBankState {
  switch (action.type) {
    case 'ADD_PHOTO':
      console.log('Adding photo to global state:', action.payload);
      return {
        ...state,
        photos: {
          ...state.photos,
          [action.payload.id]: action.payload,
        },
      };

    case 'UPDATE_PHOTO':
      const existingPhoto = state.photos[action.payload.id];
      if (!existingPhoto) return state;
      
      console.log('Updating photo in global state:', action.payload.id, action.payload.updates);
      return {
        ...state,
        photos: {
          ...state.photos,
          [action.payload.id]: {
            ...existingPhoto,
            ...action.payload.updates,
          },
        },
      };

    case 'REMOVE_PHOTO':
      const { [action.payload]: removed, ...remainingPhotos } = state.photos;
      console.log('Removing photo from global state:', action.payload);
      return {
        ...state,
        photos: remainingPhotos,
        selectedPhotos: state.selectedPhotos.filter(id => id !== action.payload),
      };

    case 'SELECT_PHOTO':
      if (state.selectedPhotos.includes(action.payload)) return state;
      return {
        ...state,
        selectedPhotos: [...state.selectedPhotos, action.payload],
      };

    case 'DESELECT_PHOTO':
      return {
        ...state,
        selectedPhotos: state.selectedPhotos.filter(id => id !== action.payload),
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedPhotos: [],
      };

    case 'SET_UPLOADING':
      return {
        ...state,
        isUploading: action.payload,
      };

    case 'SET_UPLOAD_PROGRESS':
      return {
        ...state,
        uploadProgress: action.payload,
      };

    case 'CLEAR_PHOTOS':
      return initialState;

    default:
      return state;
  }
}

interface PhotoBankContextType {
  state: PhotoBankState;
  addPhoto: (photo: PhotoItem) => void;
  updatePhoto: (id: string, updates: Partial<PhotoItem>) => void;
  removePhoto: (id: string) => void;
  selectPhoto: (id: string) => void;
  deselectPhoto: (id: string) => void;
  clearSelection: () => void;
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  clearPhotos: () => void;
  getPhotosForQuestion: (questionId: string) => PhotoItem[];
  getPhotosForAssignment: (assignmentId: string) => PhotoItem[];
  getAllPhotos: () => PhotoItem[];
}

const PhotoBankContext = createContext<PhotoBankContextType | undefined>(undefined);

export function PhotoBankProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(photoBankReducer, initialState);

  const addPhoto = useCallback((photo: PhotoItem) => {
    dispatch({ type: 'ADD_PHOTO', payload: photo });
  }, []);

  const updatePhoto = useCallback((id: string, updates: Partial<PhotoItem>) => {
    dispatch({ type: 'UPDATE_PHOTO', payload: { id, updates } });
  }, []);

  const removePhoto = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PHOTO', payload: id });
  }, []);

  const selectPhoto = useCallback((id: string) => {
    dispatch({ type: 'SELECT_PHOTO', payload: id });
  }, []);

  const deselectPhoto = useCallback((id: string) => {
    dispatch({ type: 'DESELECT_PHOTO', payload: id });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const setUploading = useCallback((uploading: boolean) => {
    dispatch({ type: 'SET_UPLOADING', payload: uploading });
  }, []);

  const setUploadProgress = useCallback((progress: number) => {
    dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: progress });
  }, []);

  const clearPhotos = useCallback(() => {
    dispatch({ type: 'CLEAR_PHOTOS' });
  }, []);

  // Helper to get photos for a specific question
  const getPhotosForQuestion = useCallback((questionId: string) => {
    const photos = Object.values(state.photos).filter(photo => photo.questionId === questionId);
    console.log(`Getting photos for question ${questionId}:`, photos);
    return photos;
  }, [state.photos]);

  // Helper to get photos for a specific assignment
  const getPhotosForAssignment = useCallback((assignmentId: string) => {
    const photos = Object.values(state.photos).filter(photo => photo.assignmentId === assignmentId);
    console.log(`Getting photos for assignment ${assignmentId}:`, photos);
    return photos;
  }, [state.photos]);

  // Helper to get all photos
  const getAllPhotos = useCallback(() => {
    const photos = Object.values(state.photos);
    console.log('Getting all photos:', photos);
    return photos;
  }, [state.photos]);

  const value: PhotoBankContextType = {
    state,
    addPhoto,
    updatePhoto,
    removePhoto,
    selectPhoto,
    deselectPhoto,
    clearSelection,
    setUploading,
    setUploadProgress,
    clearPhotos,
    getPhotosForQuestion,
    getPhotosForAssignment,
    getAllPhotos,
  };

  return (
    <PhotoBankContext.Provider value={value}>
      {children}
    </PhotoBankContext.Provider>
  );
}

export function usePhotoBank(): PhotoBankContextType {
  const context = useContext(PhotoBankContext);
  if (context === undefined) {
    throw new Error('usePhotoBank must be used within a PhotoBankProvider');
  }
  return context;
}