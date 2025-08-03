"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Trash2, 
  Volume2, 
  Timer,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AudioRecorderProps {
  questionId: string;
  onAudioChange: (audioData: AudioData | null) => void;
  disabled?: boolean;
  maxDuration?: number; // in seconds
}

export interface AudioData {
  blob: Blob;
  url: string;
  name: string;
  duration: number;
}

export function AudioRecorder({ 
  questionId, 
  onAudioChange, 
  disabled = false,
  maxDuration = 30 
}: AudioRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    if (hasPermission) return true;
    
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately after permission check
      setHasPermission(true);
      toast({ title: "Microphone Access Granted" });
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      const errorMsg = 'Microphone permission denied. Please enable it in your browser settings.';
      setPermissionError(errorMsg);
      setHasPermission(false);
      toast({ 
        variant: 'destructive', 
        title: 'Microphone Access Denied', 
        description: errorMsg 
      });
      return false;
    }
  }, [hasPermission, toast]);

  // Play audio feedback
  const playAudioFeedback = useCallback((type: 'start' | 'stop') => {
    try {
      const audioFile = type === 'start' ? '/audio/start-chime.mp3' : '/audio/stop-chime.mp3';
      const chime = new Audio(audioFile);
      chime.play().catch(e => console.warn(`Chime play error: ${(e as Error).message}`));
    } catch (e) {
      console.warn(`Could not play chime: ${e}`);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    const permissionGranted = await requestPermission();
    if (!permissionGranted) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioName = `audio_note_${questionId}_${Date.now()}.webm`;

        // Create audio element to get duration
        const tempAudio = new Audio(audioUrl);
        
        // Set up metadata loading handler
        const handleMetadataLoad = () => {
          const detectedDuration = tempAudio.duration;
          // Ensure duration is valid
          const validDuration = isNaN(detectedDuration) || !isFinite(detectedDuration) ? 0 : detectedDuration;
          
          const newAudioData: AudioData = {
            blob: audioBlob,
            url: audioUrl,
            name: audioName,
            duration: validDuration
          };
          setAudioData(newAudioData);
          onAudioChange(newAudioData);
          setDuration(validDuration);
          setCurrentTime(0);
          
          // Clean up
          tempAudio.removeEventListener('loadedmetadata', handleMetadataLoad);
          tempAudio.removeEventListener('error', handleError);
        };
        
        // Set up error handler
        const handleError = () => {
          const newAudioData: AudioData = {
            blob: audioBlob,
            url: audioUrl,
            name: audioName,
            duration: 0
          };
          setAudioData(newAudioData);
          onAudioChange(newAudioData);
          setDuration(0);
          setCurrentTime(0);
          
          // Clean up
          tempAudio.removeEventListener('loadedmetadata', handleMetadataLoad);
          tempAudio.removeEventListener('error', handleError);
        };
        
        // Add event listeners
        tempAudio.addEventListener('loadedmetadata', handleMetadataLoad);
        tempAudio.addEventListener('error', handleError);
        
        // Load the audio to trigger metadata loading
        tempAudio.load();

        playAudioFeedback('stop');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setPermissionError("An error occurred during recording.");
        toast({ 
          variant: "destructive", 
          title: "Recording Error", 
          description: "An unexpected error occurred." 
        });
        stopRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      playAudioFeedback('start');

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= maxDuration) {
            stopRecording();
            toast({ 
              title: "Recording Limit Reached", 
              description: `Recording stopped after ${maxDuration} seconds.` 
            });
            return prev;
          }
          return newTime;
        });
      }, 100);

    } catch (error) {
      console.error('Error starting recording:', error);
      setPermissionError('Failed to start recording.');
      toast({ 
        variant: "destructive", 
        title: "Recording Error", 
        description: "Failed to start recording." 
      });
    }
  }, [questionId, maxDuration, requestPermission, playAudioFeedback, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || !audioData) return;

    try {
      if (audioRef.current.paused) {
        // Ensure audio source is set
        if (!audioRef.current.src || audioRef.current.src !== audioData.url) {
          audioRef.current.src = audioData.url;
          audioRef.current.load();
        }
        
        // Wait for metadata to load before playing
        if (audioRef.current.readyState < 1) {
          await new Promise<void>((resolve, reject) => {
            const handleLoadedMetadata = () => {
              audioRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
              resolve();
            };
            const handleError = () => {
              audioRef.current?.removeEventListener('error', handleError);
              reject(new Error('Failed to load audio metadata'));
            };
            audioRef.current?.addEventListener('loadedmetadata', handleLoadedMetadata);
            audioRef.current?.addEventListener('error', handleError);
          });
        }
        
        await audioRef.current.play();
        setIsPlaying(true);
        
        // Start playback timer
        playbackTimerRef.current = setInterval(() => {
          if (audioRef.current && !audioRef.current.paused) {
            const currentTime = audioRef.current.currentTime;
            const duration = audioRef.current.duration;
            
            // Only update if we have a valid duration and current time
            if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
              // Update current time and ensure it doesn't exceed duration
              const clampedTime = Math.min(currentTime, duration);
              setCurrentTime(clampedTime);
              
              // Update duration if it's different from what we have
              if (Math.abs(duration - (audioData?.duration || 0)) > 0.1) {
                setDuration(duration);
              }
            }
          }
        }, 100);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
        
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
          playbackTimerRef.current = null;
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
      toast({ 
        variant: "destructive", 
        title: "Playback Error", 
        description: "Failed to play audio." 
      });
    }
  }, [audioData, toast]);

  // Remove audio
  const removeAudio = useCallback(() => {
    if (audioData?.url && audioData.url.startsWith('blob:')) {
      URL.revokeObjectURL(audioData.url);
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    
    setAudioData(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    onAudioChange(null);
  }, [audioData, onAudioChange]);

  // Format time display
  const formatTime = useCallback((time: number) => {
    // Handle invalid time values
    if (isNaN(time) || !isFinite(time) || time < 0) {
      return "0:00";
    }
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Handle audio events
  const handleAudioLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const detectedDuration = audioRef.current.duration;
      // Ensure duration is valid
      const validDuration = isNaN(detectedDuration) || !isFinite(detectedDuration) || detectedDuration <= 0 ? 0 : detectedDuration;
      
      // Only update duration if it's valid and different from current
      if (validDuration > 0 && Math.abs(validDuration - duration) > 0.1) {
        setDuration(validDuration);
      }
      
      // If we have audioData but duration is 0, try to update it
      if (audioData && validDuration > 0 && audioData.duration === 0) {
        const updatedAudioData = { ...audioData, duration: validDuration };
        setAudioData(updatedAudioData);
        onAudioChange(updatedAudioData);
      }
      
      // Reset current time to 0 when metadata loads
      setCurrentTime(0);
    }
  }, [audioData, onAudioChange, duration]);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  const handleSliderChange = useCallback((value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioData?.url && audioData.url.startsWith('blob:')) {
        URL.revokeObjectURL(audioData.url);
      }
    };
  }, [audioData]);

  return (
    <Card className="w-full shadow-none border-0 bg-transparent">
      <CardContent className="p-4 space-y-4">
        {/* Permission Error */}
        {permissionError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{permissionError}</AlertDescription>
          </Alert>
        )}

        {/* Recording State */}
        {isRecording && (
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-red-600 animate-pulse" />
              <span className="font-medium text-red-700 dark:text-red-300">Recording...</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
              <Timer className="h-4 w-4" />
              <span>{formatTime(recordingTime)}</span>
            </div>
            <Progress 
              value={(recordingTime / maxDuration) * 100} 
              className="flex-1 h-2" 
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              disabled={disabled}
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Audio Player */}
        {audioData && !isRecording && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={togglePlayPause}
                disabled={disabled || isUploading}
                className="h-10 w-10 rounded-full"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              
              <div className="flex-1 space-y-2">
                <Slider
                  value={[currentTime]}
                  max={duration > 0 ? duration : 0.1}
                  step={0.1}
                  onValueChange={handleSliderChange}
                  disabled={disabled || isUploading || duration <= 0}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={removeAudio}
                disabled={disabled || isUploading}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload Status */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Uploading: {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            {uploadError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Record Button */}
        {!audioData && !isRecording && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            disabled={disabled || hasPermission === false}
          >
            <Mic className="h-5 w-5 mr-2" />
            Hold to Record (Max {maxDuration}s)
          </Button>
        )}

        {/* Hidden Audio Element */}
        {audioData && (
          <audio
            ref={audioRef}
            src={audioData.url}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        )}
      </CardContent>
    </Card>
  );
} 