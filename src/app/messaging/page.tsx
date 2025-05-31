
// src/app/messaging/page.tsx
"use client";

import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import type { ChatUser, ChatMessage } from '@/types/Message';
import { getUsersForAccount, getDirectChatThreadId, sendMessage, getMessages } from '@/services/messagingService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from '@/components/ui/progress';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Image from 'next/image';
import { Users, MessageCircle, Send, Paperclip, XCircle, AlertCircle as AlertIcon } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';


export default function MessagingPage() {
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null); // General error for the page
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // State for file uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null); // Specific to upload
  const [isUploading, setIsUploading] = useState(false);


  useEffect(() => {
    if (!authLoading && !profileLoading && user && userProfile?.account && user.uid) {
      setIsLoadingUsers(true);
      setError(null);
      getUsersForAccount(userProfile.account, user.uid)
        .then(setUsers)
        .catch(err => {
          console.error("Failed to fetch users:", err);
          setError("Could not load users for chat.");
        })
        .finally(() => setIsLoadingUsers(false));
    } else if (!authLoading && !profileLoading && (!user || !userProfile?.account)) {
      setError("User account information not available. Cannot load messaging.");
      setIsLoadingUsers(false);
    }
  }, [user, userProfile, authLoading, profileLoading]);

  useEffect(() => {
    if (currentThreadId) {
      setIsLoadingMessages(true);
      const unsubscribe = getMessages(currentThreadId, (fetchedMessages) => {
        setMessages(fetchedMessages);
        setIsLoadingMessages(false);
      });
      return () => unsubscribe();
    } else {
      setMessages([]);
    }
  }, [currentThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectUser = (chatPartner: ChatUser) => {
    if (!user || !user.uid) {
      setError("Current user information is missing.");
      return;
    }
    if (selectedUser?.uid === chatPartner.uid) return;

    setSelectedUser(chatPartner);
    const threadId = getDirectChatThreadId(user.uid, chatPartner.uid);
    setCurrentThreadId(threadId);
    setMessages([]);
    removeSelectedImage(); // Clear any pending image when switching chats
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadError("File is too large. Max 5MB.");
        setImagePreviewUrl(null);
        setSelectedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
      setUploadProgress(null);
    }
  };

  const removeSelectedImage = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setUploadError(null);
    setUploadProgress(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageUploadAndSend = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); // Clear general page error

    if (!selectedFile && !newMessage.trim()) {
      return; // Should be caught by button disable logic
    }
    if (!currentThreadId || !user || !user.uid || !user.email || !selectedUser) {
        setError("Cannot send message: Critical user or session information missing.");
        return;
    }

    let finalImageUrl: string | null = null;
    let finalImageName: string | null = null;

    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      const timestamp = Date.now();
      const filePath = `chat_uploads/${currentThreadId}/${user.uid}/${timestamp}_${selectedFile.name}`;
      const fileStorageRefInstance = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRefInstance, selectedFile);

      try {
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error('Upload failed:', error);
              setUploadError(`Upload failed: ${error.message}`);
              setIsUploading(false);
              setUploadProgress(null);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                finalImageUrl = downloadURL;
                finalImageName = selectedFile.name;
                resolve();
              } catch (getUrlError) {
                console.error('Failed to get download URL:', getUrlError);
                setUploadError(`Failed to get image URL: ${(getUrlError as Error).message}`);
                reject(getUrlError);
              } finally {
                 // Do not set isUploading false here, it's handled after sendMessage
                 // setUploadProgress(100); // Visually complete
              }
            }
          );
        });
      } catch (uploadProcessError) {
        setIsUploading(false); // Ensure reset if promise chain fails
        return; 
      }
    }

    // Proceed to send message if text is present or image uploaded successfully
    if (newMessage.trim() || finalImageUrl) {
      try {
        await sendMessage(
          currentThreadId,
          user.uid,
          userProfile?.displayName || user.email,
          user.email,
          newMessage.trim(),
          finalImageUrl,
          finalImageName
        );
        setNewMessage('');
        // removeSelectedImage() will also set isUploading to false.
        removeSelectedImage(); 
      } catch (err) {
        console.error('Failed to send message:', err);
        setError('Failed to send message. Please try again.');
        // If message send fails after upload, the image is uploaded but not referenced.
        // Consider if cleanup logic is needed for orphaned uploads in a production scenario.
      }
    } else if (selectedFile && !finalImageUrl && !uploadError) {
        // This case implies an issue if upload seemed to complete but URL is missing
        setUploadError("Image processing failed after upload. Message not sent.");
    }
    setIsUploading(false); // Final reset for isUploading
  };


  if (authLoading || profileLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)]">
        <div className="w-1/3 border-r p-4 space-y-2">
          <Skeleton className="h-8 w-full mb-4" />
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
        <div className="flex-1 flex flex-col p-4">
          <Skeleton className="h-12 w-1/2 mb-4" />
          <div className="flex-grow space-y-3"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-10 w-2/3 self-end" /><Skeleton className="h-10 w-3/4" /></div>
          <Skeleton className="h-10 w-full mt-4" />
        </div>
      </div>
    );
  }

  if (error && !isLoadingUsers) { // Show general error if not loading users
    return (
      <Alert variant="destructive" className="m-4">
        <AlertIcon className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!user || !userProfile?.account) {
     return (
      <Alert variant="destructive" className="m-4">
        <AlertIcon className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>Please log in and ensure your profile is complete to use messaging.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem)-2rem)] border rounded-lg shadow-md overflow-hidden bg-card">
      <div className="w-1/3 xl:w-1/4 border-r flex flex-col">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5"/>Contacts</CardTitle>
          <CardDescription className="text-xs">Users in account: {userProfile?.account}</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-grow p-2">
          {isLoadingUsers ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                 <div key={i} className="flex items-center space-x-3 p-2 rounded-md">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                 </div>
              ))}
            </div>
          ) : users.length > 0 ? (
            users.map((u) => (
              <Button key={u.uid} variant={selectedUser?.uid === u.uid ? 'secondary' : 'ghost'} className="w-full justify-start h-auto p-3 mb-1" onClick={() => handleSelectUser(u)}>
                <Avatar className="h-9 w-9 mr-3"><AvatarImage src={`https://placehold.co/40x40.png?text=${u.displayName?.[0]?.toUpperCase()}`} data-ai-hint="avatar profile" /><AvatarFallback>{u.displayName?.[0]?.toUpperCase() || u.email[0].toUpperCase()}</AvatarFallback></Avatar>
                <div><div className="font-medium text-sm truncate">{u.displayName}</div><div className="text-xs text-muted-foreground truncate">{u.email}</div></div>
              </Button>
            ))
          ) : ( <p className="p-4 text-sm text-muted-foreground text-center">No other users found.</p> )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <CardHeader className="p-4 border-b flex flex-row items-center space-x-3">
                <Avatar className="h-10 w-10"><AvatarImage src={`https://placehold.co/40x40.png?text=${selectedUser.displayName?.[0]?.toUpperCase()}`} data-ai-hint="avatar chat" /><AvatarFallback>{selectedUser.displayName?.[0]?.toUpperCase() || selectedUser.email[0].toUpperCase()}</AvatarFallback></Avatar>
                <div><CardTitle className="text-lg">{selectedUser.displayName}</CardTitle><CardDescription className="text-xs">{selectedUser.email}</CardDescription></div>
            </CardHeader>
            
            <ScrollArea className="flex-grow p-4 space-y-4 bg-background/30">
              {isLoadingMessages ? (
                 <div className="space-y-3 p-2"><Skeleton className="h-10 w-3/5 rounded-lg p-2" /><Skeleton className="h-10 w-1/2 rounded-lg p-2 self-end ml-auto" /><Skeleton className="h-16 w-3/4 rounded-lg p-2" /></div>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <div key={msg.id || Math.random()} className={`flex flex-col mb-3 ${msg.senderUid === user.uid ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-xs md:max-w-md lg:max-w-lg p-1 rounded-xl shadow ${msg.senderUid === user.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.imageUrl && (
                        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block p-2">
                          <Image src={msg.imageUrl} alt={msg.imageName || "Uploaded image"} width={200} height={150} className="rounded-md object-cover max-h-[200px] w-auto" data-ai-hint="chat image" />
                        </a>
                      )}
                      {msg.text && <p className="text-sm px-3 pb-2 pt-1 break-words">{msg.text}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                      {msg.senderUid !== user.uid && `${msg.senderDisplayName} • `}
                      {(msg.timestamp as Timestamp)?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}
                    </span>
                  </div>
                ))
              ) : ( <div className="flex flex-col items-center justify-center h-full"><MessageCircle className="w-16 h-16 text-muted-foreground mb-4" /><p className="text-muted-foreground">No messages yet.</p><p className="text-xs text-muted-foreground">Start the conversation!</p></div>)}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {imagePreviewUrl && (
              <div className="p-3 border-t relative bg-muted/20">
                <Image src={imagePreviewUrl} alt="Preview" width={60} height={60} className="rounded object-cover shadow" data-ai-hint="upload preview" />
                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-background/50 hover:bg-background/80 rounded-full" onClick={removeSelectedImage} aria-label="Remove image">
                  <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
                {uploadProgress !== null && uploadProgress >= 0 && uploadProgress < 100 && !uploadError &&(
                  <Progress value={uploadProgress} className="w-full h-1 mt-1" />
                )}
                 {isUploading && uploadProgress === null && <Progress value={0} className="w-full h-1 mt-1 animate-pulse" />} {/* Indeterminate for initial phase */}
              </div>
            )}
            {uploadError && (
              <Alert variant="destructive" className="mx-4 mb-0 mt-2 text-xs p-2 rounded-md">
                <AlertIcon className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleImageUploadAndSend} className="p-4 border-t bg-card flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoadingMessages || isUploading} aria-label="Attach file">
                <Paperclip className="h-5 w-5" />
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/png, image/jpeg, image/gif" />
              <Input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-grow" disabled={isLoadingMessages || isUploading} />
              <Button type="submit" disabled={(!newMessage.trim() && !selectedFile) || isLoadingMessages || isUploading}>
                {isUploading ? "Uploading..." : <><Send className="h-4 w-4 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Send</span></>}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4"><MessageCircle className="w-20 h-20 text-muted-foreground mb-6" /><h2 className="text-xl font-semibold text-foreground">Select a user to start chatting</h2><p className="text-muted-foreground mt-1">Choose someone from the list on the left.</p></div>
        )}
      </div>
    </div>
  );
}

