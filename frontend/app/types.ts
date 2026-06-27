export interface ImageItem {
  id: number;
  filename: string;
  original_name?: string;
  url?: string;
  size: number;
  file_type: string;
  upload_time: string;
  views: number;
  deleted_at?: string;
}

export interface TypeCount {
  file_type: string;
  count: number;
}

export interface StatsData {
  total_images: number;
  total_size: number;
  types_count: TypeCount[];
}

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'warning' | 'danger';
  showCancel?: boolean;
  resolve?: (value: boolean) => void;
}

export interface PaginationInfo {
  total: number;
  pages: number;
}
