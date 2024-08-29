import FileUploader from '@/components/FileUploader'

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">File Uploader</h1>
      <FileUploader />
    </div>
  )
}