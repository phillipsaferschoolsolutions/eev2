"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Import CSS for styling
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill with ssr: false
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />
});

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  className,
  placeholder = "Write something...",
  readOnly = false,
}: RichTextEditorProps) {
  // Define Quill modules/formats
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean'],
      [{ 'table': [] }],
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'indent',
    'align',
    'link', 'image',
    'table',
  ];

  return (
    <div className={cn("rich-text-editor-container", className)}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        className="min-h-[300px]"
      />
      <style jsx global>{`
        .ql-editor {
          min-height: 300px;
          font-size: 1rem;
          line-height: 1.5;
        }
        .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          background-color: hsl(var(--muted));
          border-color: hsl(var(--border));
        }
        .ql-container {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          border-color: hsl(var(--border));
          background-color: hsl(var(--background));
        }
        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  );
}