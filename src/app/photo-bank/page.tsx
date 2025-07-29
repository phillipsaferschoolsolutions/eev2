"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getAssignmentListMetadata } from '@/services/assignmentFunctionsService';
import { PhotoBank } from '@/components/ui/photo-bank';

export default function PhotoBankPage() {
  const { userProfile } = useAuth();
  const [availableQuestions, setAvailableQuestions] = useState<Array<{ id: string; label: string; photoUpload: boolean }>>([]);

  useEffect(() => {
    if (userProfile?.account) {
      // Fetch assignments to get questions that support photo upload
      getAssignmentListMetadata()
        .then(assignments => {
          const questions: Array<{ id: string; label: string; photoUpload: boolean }> = [];
          assignments.forEach(assignment => {
            if (assignment.questions && Array.isArray(assignment.questions)) {
              assignment.questions.forEach((question: any) => {
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
          setAvailableQuestions(questions);
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