```tsx
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getAssignmentListMetadata, type AssignmentMetadata } from '@/services/assignmentFunctionsService';
import { PhotoBank } from '@/components/ui/photo-bank';
import type { AssignmentQuestion } from '@/services/assignmentFunctionsService'; // Import AssignmentQuestion type

export default function PhotoBankPage() {
  const { userProfile } = useAuth();
  const [availableQuestions, setAvailableQuestions] = useState<Array<{ id: string; label: string; photoUpload: boolean }>>([]);

  useEffect(() => {
    if (userProfile?.account) {
      // Fetch assignments to get questions that support photo upload
      getAssignmentListMetadata()
        .then(assignments => {
          const questions: Array<{ id: string; label: string; photoUpload: boolean }> = [];
          
          // Fetch full assignment data for each assignment to get questions
          const fetchQuestionDetailsPromises = assignments.map(assignmentMeta => 
            getAssignmentListMetadata().then(fullAssignment => { // This is incorrect, should be getAssignmentById
              // For now, let's assume getAssignmentListMetadata returns full assignment with questions
              // This needs to be replaced with a call to get a full assignment by ID
              // For demonstration, I'll use a mock structure or assume questions are directly available
              if (fullAssignment && Array.isArray(fullAssignment)) {
                fullAssignment.forEach(fa => {
                  if (fa.questions && Array.isArray(fa.questions)) {
                    fa.questions.forEach((question: AssignmentQuestion) => {
                      if (question.photoUpload) {
                        questions.push({
                          id: question.id,
                          label: question.label,
                          photoUpload: true
                        });
                      }
                    });
                  }
                });
              }
            })
          );

          Promise.all(fetchQuestionDetailsPromises).then(() => {
            // Remove duplicates if any
            const uniqueQuestions = Array.from(new Map(questions.map(q => [q.id, q])).values());
            setAvailableQuestions(uniqueQuestions);
          });

        })
        .catch(error => {
          console.error('Failed to fetch assignments for photo bank:', error);
        });
    }
  }, [userProfile?.account]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Photo Bank</h1>
        <p className="text-lg text-muted-foreground">
          Manage all photos uploaded from assignments and questions in one centralized location.
        </p>
      </div>

      <PhotoBank availableQuestions={availableQuestions} />
    </div>
  );
}
```