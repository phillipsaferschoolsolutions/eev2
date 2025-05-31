// src/app/messaging/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import type { ChatUser, ChatMessage } from '@/types/Message';
import { getUsersForAccount, getDirectChatThreadId, sendMessage, getMessages } from '@/services/messagingService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PaperPlaneIcon } from '@radix-ui/react-icons'; // Placeholder, replace if not available
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Users, MessageCircle, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      setMessages([]); // Clear messages if no thread is selected
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
    if (selectedUser?.uid === chatPartner.uid) return; // Already selected

    setSelectedUser(chatPartner);
    const threadId = getDirectChatThreadId(user.uid, chatPartner.uid);
    setCurrentThreadId(threadId);
    setMessages([]); // Clear previous messages
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentThreadId || !user || !user.uid || !user.email || !selectedUser) {
      return;
    }
    // Optimistic UI update (optional, can be more complex)
    // const optimisticMessage: ChatMessage = {
    //   senderUid: user.uid,
    //   senderDisplayName: userProfile?.displayName || user.email || 'You',
    //   senderEmail: user.email,
    //   text: newMessage.trim(),
    //   timestamp: new Date() // Temporary, will be replaced by server timestamp
    // };
    // setMessages(prev => [...prev, optimisticMessage]);

    try {
      await sendMessage(
        currentThreadId,
        user.uid,
        userProfile?.displayName || user.email,
        user.email,
        newMessage.trim()
      );
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Revert optimistic update if it was implemented
    }
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
          <div className="flex-grow space-y-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-2/3 self-end" />
            <Skeleton className="h-10 w-3/4" />
          </div>
          <Skeleton className="h-10 w-full mt-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!user || !userProfile?.account) {
     return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>Please log in and ensure your profile is complete to use messaging.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem)-2rem)] border rounded-lg shadow-md overflow-hidden bg-card"> {/* Adjust height based on your header */}
      {/* User List Sidebar */}
      <div className="w-1/3 xl:w-1/4 border-r flex flex-col">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5"/>Contacts</CardTitle>
          <CardDescription className="text-xs">Users in your account: {userProfile?.account}</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-grow p-2">
          {isLoadingUsers ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                 <div key={i} className="flex items-center space-x-3 p-2 rounded-md">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                 </div>
              ))}
            </div>
          ) : users.length > 0 ? (
            users.map((u) => (
              <Button
                key={u.uid}
                variant={selectedUser?.uid === u.uid ? 'secondary' : 'ghost'}
                className="w-full justify-start h-auto p-3 mb-1"
                onClick={() => handleSelectUser(u)}
              >
                <Avatar className="h-9 w-9 mr-3">
                  <AvatarImage src={`https://placehold.co/40x40.png?text=${u.displayName?.[0]?.toUpperCase()}`} data-ai-hint="avatar profile" />
                  <AvatarFallback>{u.displayName?.[0]?.toUpperCase() || u.email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-medium text-sm truncate">{u.displayName}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
              </Button>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground text-center">No other users found in your account.</p>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <CardHeader className="p-4 border-b flex flex-row items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://placehold.co/40x40.png?text=${selectedUser.displayName?.[0]?.toUpperCase()}`} data-ai-hint="avatar chat" />
                  <AvatarFallback>{selectedUser.displayName?.[0]?.toUpperCase() || selectedUser.email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-lg">{selectedUser.displayName}</CardTitle>
                    <CardDescription className="text-xs">{selectedUser.email}</CardDescription>
                </div>
            </CardHeader>
            
            <ScrollArea className="flex-grow p-4 space-y-4 bg-background/30">
              {isLoadingMessages ? (
                 <div className="space-y-3 p-2">
                    <Skeleton className="h-10 w-3/5 rounded-lg p-2" />
                    <Skeleton className="h-10 w-1/2 rounded-lg p-2 self-end ml-auto" />
                    <Skeleton className="h-16 w-3/4 rounded-lg p-2" />
                 </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg.id || Math.random()} // Fallback key, ensure msg.id is set by Firestore
                    className={`flex flex-col mb-3 ${
                      msg.senderUid === user.uid ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl shadow ${
                        msg.senderUid === user.uid
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                      {msg.senderUid !== user.uid && `${msg.senderDisplayName} • `}
                      {(msg.timestamp as Timestamp)?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                    <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No messages yet.</p>
                    <p className="text-xs text-muted-foreground">Start the conversation!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-card flex items-center gap-2">
              <Input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow"
                disabled={isLoadingMessages}
              />
              <Button type="submit" disabled={!newMessage.trim() || isLoadingMessages}>
                <Send className="h-4 w-4 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <MessageCircle className="w-20 h-20 text-muted-foreground mb-6" />
            <h2 className="text-xl font-semibold text-foreground">Select a user to start chatting</h2>
            <p className="text-muted-foreground mt-1">Choose someone from the list on the left.</p>
          </div>
        )}
      </div>
    </div>
  );
}
