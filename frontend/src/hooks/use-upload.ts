import { createTask, getTask, getUploadUrl, uploadToR2 } from '@frontend/lib/api';
import { asyncPool } from '@frontend/lib/async-pool';
import type { FileItem } from '@frontend/lib/file-state';
import { fileReducer } from '@frontend/lib/file-state';
import { useCallback, useReducer, useState } from 'react';

const CONCURRENCY = 3;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

export function useUpload() {
  const [files, dispatch] = useReducer(fileReducer, []);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    dispatch({ files: newFiles, type: 'ADD_FILES' });
  }, []);

  const removeFile = useCallback((id: string) => {
    dispatch({ id, type: 'REMOVE_FILE' });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const processFile = useCallback(
    async (item: FileItem, templateId?: string, disclaimerAccepted?: boolean): Promise<void> => {
      try {
        // 1. Get presigned upload URL
        dispatch({ id: item.id, progress: 10, status: 'uploading', type: 'UPDATE_STATUS' });
        const { uploadUrl, r2Key } = await getUploadUrl(item.file.name, item.file.type, item.file.size);
        dispatch({ id: item.id, r2Key, type: 'SET_R2_KEY' });

        // 2. Upload file to R2
        dispatch({ id: item.id, progress: 40, status: 'uploading', type: 'UPDATE_STATUS' });
        await uploadToR2(uploadUrl, item.file);
        dispatch({ id: item.id, progress: 60, status: 'uploaded', type: 'UPDATE_STATUS' });

        // 3. Create analysis task
        const task = await createTask(r2Key, templateId, disclaimerAccepted);
        dispatch({ id: item.id, taskId: task.id, type: 'SET_TASK_ID' });
        dispatch({ id: item.id, progress: 70, status: 'analyzing', type: 'UPDATE_STATUS' });

        // 4. Poll for result
        let attempts = 0;
        while (attempts < MAX_POLL_ATTEMPTS) {
          const result = await getTask(task.id);
          if (result.status === 'completed') {
            dispatch({ id: item.id, result, type: 'SET_RESULT' });
            return;
          }
          if (result.status === 'failed') {
            const errorMsg = (result.result as Record<string, unknown> | undefined)?.error;
            if (errorMsg === 'not_invoice') {
              dispatch({ id: item.id, status: 'not-invoice', type: 'UPDATE_STATUS' });
            } else {
              dispatch({ error: String(errorMsg ?? 'Processing failed'), id: item.id, type: 'SET_ERROR' });
            }
            return;
          }
          const delay = result.retryAfter ? result.retryAfter * 1000 : POLL_INTERVAL_MS;
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts += 1;
          const progress = Math.min(95, 70 + Math.floor((attempts / MAX_POLL_ATTEMPTS) * 25));
          dispatch({ id: item.id, progress, status: 'analyzing', type: 'UPDATE_STATUS' });
        }
        dispatch({ error: 'Timed out waiting for analysis result', id: item.id, type: 'SET_ERROR' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        dispatch({ error: message, id: item.id, type: 'SET_ERROR' });
      }
    },
    [],
  );

  const startUpload = useCallback(
    async (options?: { templateId?: string; disclaimerAccepted?: boolean }): Promise<void> => {
      const pending = files.filter(f => f.status === 'pending');
      if (pending.length === 0) return;
      setIsUploading(true);
      try {
        await asyncPool(pending, CONCURRENCY, item =>
          processFile(item, options?.templateId, options?.disclaimerAccepted),
        );
      } finally {
        setIsUploading(false);
      }
    },
    [files, processFile],
  );

  const progress =
    files.length === 0 ? 0 : Math.round((files.filter(f => f.status === 'done').length / files.length) * 100);

  return {
    addFiles,
    clearAll,
    files,
    isUploading,
    progress,
    removeFile,
    startUpload,
  };
}
