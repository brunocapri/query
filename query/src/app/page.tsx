"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{
    success: boolean;
    fileName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    url: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }
    
    setUploading(true);
    setError(null);
    setUploadResults([]);
    
    const results = [];
    
    // Upload each file
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload file');
        }
        
        results.push(data);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setError(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    setUploadResults(results);
    setUploading(false);
    
    // Clear the files after upload
    setFiles([]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Document Upload</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragging 
                  ? 'border-foreground bg-foreground/5' 
                  : 'border-gray-300 dark:border-gray-700 hover:border-foreground'
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Drag and drop files here, or click to select files
                </p>
                <p className="text-xs text-gray-500">
                  You can upload one or multiple files at once
                </p>
              </div>
            </div>
            
            {files.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Selected Files:</h3>
                <ul className="space-y-2">
                  {files.map((file, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={files.length === 0 || uploading}
            className={`rounded-full border border-solid border-transparent transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 ${
              files.length === 0 || uploading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc]'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </form>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {uploadResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Upload Results</h3>
            <div className="space-y-3">
              {uploadResults.map((result, index) => (
                <div key={index} className="p-3 bg-green-100 text-green-700 rounded-md">
                  <p className="font-medium">Upload successful!</p>
                  <p className="text-sm mt-1">File: {result.originalName}</p>
                  <p className="text-sm">Size: {(result.fileSize / 1024).toFixed(2)} KB</p>
                  <a 
                    href={result.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline mt-2 block"
                  >
                    View uploaded file
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
