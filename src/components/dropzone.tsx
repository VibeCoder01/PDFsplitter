
"use client";

import { useState, useCallback, type DragEvent, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface DropzoneProps {
  onFileDrop: (file: File) => void;
  className?: string;
  disabled?: boolean;
}

export default function Dropzone({ onFileDrop, className, disabled = false }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | undefined) => {
    if (file && file.type === 'application/pdf') {
      onFileDrop(file);
    }
  }, [onFileDrop]);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={cn(
        "relative w-full cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-8 text-center transition-colors duration-200 hover:border-primary/50 hover:bg-accent/10",
        isDragActive && "border-primary bg-primary/10",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        id="pdf-upload"
        className="hidden"
        accept=".pdf"
        onChange={handleChange}
        disabled={disabled}
      />
      <Label htmlFor="pdf-upload" className="flex h-full w-full cursor-pointer flex-col items-center justify-center">
        <UploadCloud className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">
          Drag and drop your PDF here
        </h3>
        <p className="mt-1 text-muted-foreground">or click to browse</p>
        <p className="mt-2 text-xs text-muted-foreground/80">PDF files only</p>
      </Label>
    </div>
  );
}
