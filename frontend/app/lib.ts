export const API_BASE = '/api';

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    try {
      const data = await response.json();
      message = data.error || data.detail || message;
    } catch {
      // Keep the HTTP status text when the response is empty.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null as any;
  return response.json();
}

export function formatFileSize(bytes: number = 0): string {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'Kb', 'Mb', 'Gb'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(value: string | undefined, friendly: boolean = false): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (friendly) {
    try {
      const now = new Date();
      // Reset hours to compare calendar days
      const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffTime = dNow.getTime() - dDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return `${formattedDate} (Today)`;
      } else if (diffDays === 1) {
        return `${formattedDate} (Yesterday)`;
      } else if (diffDays > 1 && diffDays <= 7) {
        return `${formattedDate} (${diffDays} days ago)`;
      }
    } catch (e) {
      console.error('[formatDate] Error calculating friendly date:', e);
    }
  }

  return formattedDate;
}

export function imagePath(filename: string): string {
  return `/images/${encodeURIComponent(filename)}`;
}

export function normalizeFileType(type: string | undefined): string {
  if (!type) return '-';
  return type.toLowerCase() === 'jpeg' ? 'JPG' : type.toUpperCase();
}
