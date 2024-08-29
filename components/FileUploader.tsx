'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from '@aws-sdk/lib-storage'
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { X } from 'lucide-react'

interface FileWithPreview extends File {
  preview: string;
}

export default function FileUploader() {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSucess] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [
      ...prevFiles,
      ...acceptedFiles.map(file => Object.assign(file, {
        preview: URL.createObjectURL(file)
      }))
    ])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const removeFile = (file: FileWithPreview) => {
    setFiles(prevFiles => prevFiles.filter(f => f !== file))
    URL.revokeObjectURL(file.preview)
  }

  const uploadToS3 = async () => {
    setUploading(true)
    setUploadSucess(false)
    setUploadProgress(0)

    const s3Config: S3ClientConfig = {
      endpoint: process.env.NEXT_PUBLIC_S3_BUCKET_ENDPOINT,
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!
      }
    }

    const client = new S3Client(s3Config)

    for (const file of files) {
      const upload = new Upload({
        client,
        params: {
          Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
          Key: file.name,
          Body: file
        }
      })

      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percentProgress = (progress.loaded / progress.total) * 100
          setUploadProgress(percentProgress)
        }
      })

      try {
        await upload.done()
        setUploadSucess(true)
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }

    setUploading(false)
    setFiles([])
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
          isDragActive ? 'border-primary' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag &apos;n&apos; drop some files here, or click to select files</p>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Preview:</h2>
          <div className="grid grid-cols-3 gap-4">
            {files.map((file) => (
              <div key={file.name} className="relative group">
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeFile(file)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {uploadSuccess && 'upload successful'}
      {files.length > 0 && (
        <div className="mt-8">
          <Button onClick={uploadToS3} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload to S3'}
          </Button>
          {uploading && (
            <div className="mt-4">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-500 mt-2">{Math.round(uploadProgress)}% uploaded</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}