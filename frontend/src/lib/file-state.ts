import type { TaskResponse } from '@frontend/lib/api';

export type FileStatus = 'pending' | 'uploading' | 'uploaded' | 'analyzing' | 'done' | 'error' | 'not-invoice';

export type FileItem = {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  r2Key?: string;
  taskId?: string;
  result?: TaskResponse;
  error?: string;
};

export type FileAction =
  | { type: 'ADD_FILES'; files: File[] }
  | { type: 'UPDATE_STATUS'; id: string; status: FileStatus; progress?: number }
  | { type: 'SET_R2_KEY'; id: string; r2Key: string }
  | { type: 'SET_TASK_ID'; id: string; taskId: string }
  | { type: 'SET_RESULT'; id: string; result: TaskResponse }
  | { type: 'SET_ERROR'; id: string; error: string }
  | { type: 'REMOVE_FILE'; id: string }
  | { type: 'CLEAR_ALL' };

let _counter = 0;
function nextId(): string {
  _counter += 1;
  return `file-${Date.now()}-${_counter}`;
}

export function fileReducer(state: FileItem[], action: FileAction): FileItem[] {
  switch (action.type) {
    case 'ADD_FILES':
      return [
        ...state,
        ...action.files.map(file => ({
          file,
          id: nextId(),
          progress: 0,
          status: 'pending' as FileStatus,
        })),
      ];

    case 'UPDATE_STATUS':
      return state.map(item =>
        item.id === action.id ? { ...item, progress: action.progress ?? item.progress, status: action.status } : item,
      );

    case 'SET_R2_KEY':
      return state.map(item => (item.id === action.id ? { ...item, r2Key: action.r2Key } : item));

    case 'SET_TASK_ID':
      return state.map(item => (item.id === action.id ? { ...item, taskId: action.taskId } : item));

    case 'SET_RESULT':
      return state.map(item =>
        item.id === action.id ? { ...item, result: action.result, status: 'done' as FileStatus } : item,
      );

    case 'SET_ERROR':
      return state.map(item =>
        item.id === action.id ? { ...item, error: action.error, status: 'error' as FileStatus } : item,
      );

    case 'REMOVE_FILE':
      return state.filter(item => item.id !== action.id);

    case 'CLEAR_ALL':
      return [];

    default:
      return state;
  }
}
