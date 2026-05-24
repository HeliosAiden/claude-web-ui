import { useCallback, useState } from 'react';
import type { ClipboardEvent } from 'react';
import { useDropzone } from 'react-dropzone';

export function useChatMediaState() {
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState<Map<string, number>>(new Map());
  const [imageErrors, setImageErrors] = useState<Map<string, string>>(new Map());
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [fileErrors, setFileErrors] = useState<Map<string, string>>(new Map());

  const handleImageFiles = useCallback((files: File[]) => {
    const validFiles = files.filter((file) => {
      try {
        if (!file || typeof file !== 'object') {
          console.warn('Invalid file object:', file);
          return false;
        }

        if (!file.type || !file.type.startsWith('image/')) {
          return false;
        }

        if (!file.size || file.size > 5 * 1024 * 1024) {
          const fileName = file.name || 'Unknown file';
          setImageErrors((previous) => {
            const next = new Map(previous);
            next.set(fileName, 'File too large (max 5MB)');
            return next;
          });
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error validating file:', error, file);
        return false;
      }
    });

    if (validFiles.length > 0) {
      setAttachedImages((previous) => [...previous, ...validFiles].slice(0, 5));
    }
  }, []);

  const handleFileFiles = useCallback((files: File[]) => {
    const validFiles = files.filter((file) => {
      try {
        if (!file || typeof file !== 'object') return false;
        if (file.type.startsWith('image/')) return false;
        if (!file.size || file.size > 10 * 1024 * 1024) {
          const fileName = file.name || 'Unknown file';
          setFileErrors((previous) => {
            const next = new Map(previous);
            next.set(fileName, 'File too large (max 10MB)');
            return next;
          });
          return false;
        }
        return true;
      } catch (error) {
        console.error('Error validating file:', error, file);
        return false;
      }
    });

    if (validFiles.length > 0) {
      setAttachedFiles((previous) => [...previous, ...validFiles].slice(0, 10));
    }
  }, []);

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(event.clipboardData.items);

      items.forEach((item) => {
        if (!item.type.startsWith('image/')) return;
        const file = item.getAsFile();
        if (file) {
          handleImageFiles([file]);
        }
      });

      if (items.length === 0 && event.clipboardData.files.length > 0) {
        const files = Array.from(event.clipboardData.files);
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          handleImageFiles(imageFiles);
        }
      }
    },
    [handleImageFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    maxSize: 10 * 1024 * 1024,
    maxFiles: 10,
    onDrop: (acceptedFiles) => {
      const imageFiles = acceptedFiles.filter((f) => f.type.startsWith('image/'));
      const otherFiles = acceptedFiles.filter((f) => !f.type.startsWith('image/'));
      if (imageFiles.length > 0) handleImageFiles(imageFiles);
      if (otherFiles.length > 0) handleFileFiles(otherFiles);
    },
    noClick: true,
    noKeyboard: true,
  });

  return {
    attachedImages,
    setAttachedImages,
    uploadingImages,
    setUploadingImages,
    imageErrors,
    setImageErrors,
    attachedFiles,
    setAttachedFiles,
    uploadingFiles,
    setUploadingFiles,
    fileErrors,
    setFileErrors,
    getRootProps,
    getInputProps,
    isDragActive,
    openImagePicker: open,
    openFilePicker: open,
    handleImageFiles,
    handleFileFiles,
    handlePaste,
  };
}
