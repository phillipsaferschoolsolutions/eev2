```tsx
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getAssignmentListMetadata, getAssignmentById, type AssignmentQuestion } from '@/services/assignmentFunctionsService';
import { PhotoBank } from '@/components/ui/photo-bank';

export default function PhotoBankPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [availableQuestions, setAvailableQuestions] = useState<Array<{ id: string; label: string; photoUpload: boolean }>>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!userProfile?.account) return;

      try {
        const assignmentsMetadata = await getAssignmentListMetadata();
        const questions: Array<{ id: string; label: string; photoUpload: boolean }> = [];

        for (const assignmentMeta of assignmentsMetadata) {
          // Fetch full assignment details to get questions
          const fullAssignment = await getAssignmentById(assignmentMeta.id, userProfile.account);
          if (fullAssignment && fullAssignment.questions && Array.isArray(fullAssignment.questions)) {
            fullAssignment.questions.forEach((question: AssignmentQuestion) => {
              if (question.photoUpload) {
                questions.push({
                  id: question.id,
                  label: question.label,
                  photoUpload: true
                });
              }
            });
          }
        }
        // Remove duplicates if any
        const uniqueQuestions = Array.from(new Map(questions.map(q => [q.id, q])).values());
        setAvailableQuestions(uniqueQuestions);

      } catch (error) {
        console.error('Failed to fetch assignments or questions for photo bank:', error);
      }
    };

    if (!authLoading && userProfile?.account) {
      fetchQuestions();
    }
  }, [userProfile?.account, authLoading]);

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