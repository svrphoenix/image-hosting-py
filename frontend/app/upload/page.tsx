'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import AppModal from '../components/AppModal';
import ImageCard from '../components/ImageCard';
import TrashCard from '../components/TrashCard';
import {apiRequest, formatFileSize, imagePath, normalizeFileType} from '../lib';
import {DialogOptions, ImageItem, PaginationInfo, StatsData} from '../types';

const DEFAULT_LIMIT = 8;
const LIMITS = [4, 8, 12];
const TABS = ['upload', 'images', 'stats', 'trash'] as const;
type TabType = typeof TABS[number];

function useDialog() {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);

  const openDialog = useCallback((options: DialogOptions) => new Promise<boolean>((resolve) => {
    setDialog({ ...options, resolve });
  }), []);

  const closeDialog = useCallback(() => setDialog(null), []);

  return {
    dialog,
    closeDialog,
    confirmDialog: useCallback((options: Omit<DialogOptions, 'showCancel' | 'resolve'>) => openDialog({ ...options, showCancel: true }), [openDialog]),
    messageDialog: useCallback((options: Omit<DialogOptions, 'showCancel' | 'resolve'>) => openDialog({ ...options, showCancel: false }), [openDialog])
  };
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialized = useRef(false);
  const { dialog, closeDialog, confirmDialog, messageDialog } = useDialog();

  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [uploadStatus, setUploadStatus] = useState<{ message: string; tone: 'default' | 'warning' | 'error' }>({
    message: 'Select a file or drag and drop here',
    tone: 'default'
  });
  const [resultUrl, setResultUrl] = useState('');
  const [copiedResult, setCopiedResult] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({ search: '', file_type: '', date_from: '', date_to: '' });
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, pages: 1 });

  const [stats, setStats] = useState<StatsData | null>(null);
  const [popular, setPopular] = useState<ImageItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const [trash, setTrash] = useState<ImageItem[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashPage, setTrashPage] = useState(1);
  const [trashPagination, setTrashPagination] = useState<PaginationInfo>({ total: 0, pages: 1 });

  // 1. Initial State Load (Runs once on mount)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = (params.get('tab') || localStorage.getItem('image_host_active_tab') || 'upload') as TabType;
    const savedLimit = Number(localStorage.getItem('image_host_limit')) || DEFAULT_LIMIT;
    const savedOrder = (localStorage.getItem('image_host_sort_order') || 'desc') as 'asc' | 'desc';
    
    let savedFilters: any = {};
    try {
      savedFilters = JSON.parse(localStorage.getItem('image_host_filters') || '{}');
    } catch {
      // Ignore parsing errors
    }

    if (TABS.includes(tab)) setActiveTab(tab);
    if (LIMITS.includes(savedLimit)) setLimit(savedLimit);
    if (['asc', 'desc'].includes(savedOrder)) setOrder(savedOrder);
    
    setFilters({
      search: params.get('search') || savedFilters.search || '',
      file_type: params.get('file_type') || savedFilters.file_type || '',
      date_from: params.get('date_from') || savedFilters.date_from || '',
      date_to: params.get('date_to') || savedFilters.date_to || ''
    });

    const urlPage = Number(params.get('page'));
    if (urlPage > 0) setPage(urlPage);
    const urlLimit = Number(params.get('limit'));
    if (LIMITS.includes(urlLimit)) setLimit(urlLimit);
    const urlOrder = params.get('order');
    if (urlOrder === 'asc' || urlOrder === 'desc') setOrder(urlOrder);

    isInitialized.current = true;
  }, []);

  // 2. Synchronize URL query parameters and local storage when state changes (only after initialized)
  useEffect(() => {
    if (!isInitialized.current) return;

    localStorage.setItem('image_host_active_tab', activeTab);
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    
    if (activeTab === 'images') {
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('order', order);
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
    }
    
    window.history.replaceState({}, '', `/upload?${params.toString()}`);
  }, [activeTab, filters, limit, order, page]);

  const loadImages = useCallback(async () => {
    setImagesLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        order
      });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const data = await apiRequest<{ items: ImageItem[]; pagination: PaginationInfo }>(`/images/?${params.toString()}`);
      const items = data.items || [];
      
      // If the page is empty but we are beyond page 1, shift back a page
      if (items.length === 0 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        setImages(items);
        setPagination(data.pagination || { total: 0, pages: 1 });
      }
    } catch (error: any) {
      await messageDialog({ title: 'Images Load Failed', message: error.message, confirmText: 'Close', variant: 'danger' });
    } finally {
      setImagesLoading(false);
    }
  }, [filters, limit, messageDialog, order, page]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [statsData, popularData] = await Promise.all([
        apiRequest<StatsData>('/stats/'),
        apiRequest<ImageItem[]>('/images/popular/?limit=5')
      ]);
      setStats(statsData);
      setPopular(popularData || []);
    } catch (error: any) {
      await messageDialog({ title: 'Stats Load Failed', message: error.message, confirmText: 'Close', variant: 'danger' });
    } finally {
      setStatsLoading(false);
    }
  }, [messageDialog]);

  const loadTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const data = await apiRequest<{ items: ImageItem[]; pagination: PaginationInfo }>(
        `/trash/?page=${trashPage}&limit=${DEFAULT_LIMIT}`
      );
      setTrash(data.items || []);
      setTrashPagination(data.pagination || { total: 0, pages: 1 });
    } catch (error: any) {
      await messageDialog({ title: 'Trash Load Failed', message: error.message, confirmText: 'Close', variant: 'danger' });
    } finally {
      setTrashLoading(false);
    }
  }, [messageDialog, trashPage]);

  useEffect(() => {
    if (activeTab === 'images') loadImages();
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'trash') loadTrash();
  }, [activeTab, loadImages, loadStats, loadTrash]);

  const setTab = (tab: TabType) => {
    setActiveTab(tab);
  };

  const onFilterChange = (key: string, value: string) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    localStorage.setItem('image_host_filters', JSON.stringify(nextFilters));
    setPage(1);
  };

  const uploadFile = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setUploadStatus({
        message: `Upload failed: invalid file type. Allowed: ${allowedTypes.join(', ')}`,
        tone: 'error'
      });
      return;
    }

    if (file.size > maxSize) {
      setUploadStatus({ message: 'Upload failed: file too large (max 5MB)', tone: 'error' });
      return;
    }

    try {
      setUploadStatus({ message: 'Uploading...', tone: 'default' });
      const form = new FormData();
      form.append('file', file);
      const data = await apiRequest<{ status: string; filename: string; url: string }>('/upload', {
        method: 'POST',
        body: form
      });
      const directUrl = `${window.location.origin}${data.url}`;
      setResultUrl(directUrl);

      if (data.status === 'warning') {
        setUploadStatus({ message: `Duplicate found: ${data.filename}`, tone: 'warning' });
        const openExisting = await confirmDialog({
          title: 'Duplicate Image',
          message: 'This file already exists. The existing direct link has been placed into the current upload field.',
          confirmText: 'View Existing',
          cancelText: 'Stay Here',
          variant: 'warning'
        });
        if (openExisting) {
          router.push(`/image-detail?filename=${encodeURIComponent(data.filename)}`);
        }
        return;
      }

      setUploadStatus({ message: `File uploaded: ${data.filename}`, tone: 'default' });
      if (activeTab === 'images') loadImages();
    } catch (error: any) {
      setUploadStatus({ message: `Upload failed: ${error.message}`, tone: 'error' });
      await messageDialog({ title: 'Upload Failed', message: error.message, confirmText: 'Close', variant: 'danger' });
    }
  };

  const deleteImage = async (filename: string) => {
    const confirmed = await confirmDialog({
      title: 'Move to Trash',
      message: `Move "${filename}" to trash? You can restore it later from the Trash tab.`,
      confirmText: 'Move to Trash',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await apiRequest(`/images/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      loadImages();
    } catch (error: any) {
      await messageDialog({ title: 'Delete Failed', message: error.message, confirmText: 'Close', variant: 'danger' });
    }
  };

  const restoreImage = async (filename: string) => {
    try {
      await apiRequest(`/images/${encodeURIComponent(filename)}/restore`, { method: 'POST' });
      loadTrash();
    } catch (error: any) {
      await messageDialog({ title: 'Restore Failed', message: error.message, confirmText: 'Close', variant: 'danger' });
    }
  };

  const purgeTrash = async () => {
    const confirmed = await confirmDialog({
      title: 'Purge Trash',
      message: 'Permanently delete every image currently in trash? This cannot be undone.',
      confirmText: 'Purge Trash',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await apiRequest('/trash/', { method: 'DELETE' });
      if (trashPage === 1) {
        loadTrash();
      } else {
        setTrashPage(1);
      }
    } catch (error: any) {
      await messageDialog({ title: 'Purge Failed', message: error.message, confirmText: 'Close', variant: 'danger' });
    }
  };

  const copyResultUrl = async () => {
    if (!resultUrl) return;
    try {
      await navigator.clipboard.writeText(resultUrl);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 1500);
    } catch (err) {
      console.error('Failed to copy direct link:', err);
    }
  };

  const typeCount = useMemo(() => stats?.types_count || [], [stats]);

  return (
    <main className="page-container">
      <header className="header-container">
        <h1 className="header-title">Upload Photos</h1>
        <p className="header-subtitle">Upload selfies, memes, or any fun pictures here.</p>
      </header>

      <nav className="tabs" aria-label="Primary sections">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : 'inactive'}`}
            type="button"
            onClick={() => setTab(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {activeTab === 'upload' && (
        <section className="upload-section">
          <div
              className={`drop-area ${isDragOver ? 'dragover' : ''}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file) uploadFile(file);
              }}
          >
            <div className="upload-icon">
              <i className="fas fa-cloud-upload-alt fa-3x"></i>
            </div>
            {/*<div className="upload-icon">↑</div>*/}

            <div className="upload-text">
              <p className={`upload-main-text ${uploadStatus.tone}`}>{uploadStatus.message}</p>
              <p className="upload-sub-text">Only support .jpg, .png and .gif. Maximum file size is 5MB</p>
            </div>
          </div>

          <div className="upload-button">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              Browse your file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadFile(file);
                event.target.value = '';
              }}
            />
          </div>

          <section className="upload-result">
            <p className="result-title">Current Upload</p>
            <div className="result-box">
              <input type="text" value={resultUrl} placeholder="https://" readOnly />
              <button className="copy-btn" type="button" onClick={copyResultUrl}>
                {copiedResult ? 'Copied!' : 'COPY'}
              </button>
            </div>
          </section>
        </section>
      )}

      {activeTab === 'images' && (
        <section className="images-section">
          <div className="gallery-controls">
            <div className="sort-controls">
              <select
                value={order}
                onChange={(event) => {
                  const nextOrder = event.target.value as 'asc' | 'desc';
                  setOrder(nextOrder);
                  localStorage.setItem('image_host_sort_order', nextOrder);
                  setPage(1);
                }}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div className="filter-controls">
              <input
                type="search"
                value={filters.search}
                placeholder="Search by name"
                onChange={(event) => onFilterChange('search', event.target.value)}
              />
              <select
                value={filters.file_type}
                onChange={(event) => onFilterChange('file_type', event.target.value)}
              >
                <option value="">All types</option>
                <option value="jpg">JPG / JPEG</option>
                <option value="png">PNG</option>
                <option value="gif">GIF</option>
              </select>
              <input
                type="date"
                value={filters.date_from}
                onChange={(event) => onFilterChange('date_from', event.target.value)}
                aria-label="Uploaded from"
              />
              <input
                type="date"
                value={filters.date_to}
                onChange={(event) => onFilterChange('date_to', event.target.value)}
                aria-label="Uploaded to"
              />
              <button
                className="secondary-action-btn"
                type="button"
                onClick={() => {
                  const emptyFilters = { search: '', file_type: '', date_from: '', date_to: '' };
                  setFilters(emptyFilters);
                  localStorage.setItem('image_host_filters', JSON.stringify(emptyFilters));
                  setPage(1);
                }}
              >
                Clear
              </button>
            </div>
            <div className="limit-controls">
              <div className="limit-select">
                <label htmlFor="limit-select-input">Show:</label>
                <select
                  id="limit-select-input"
                  value={limit}
                  onChange={(event) => {
                    const nextLimit = Number(event.target.value);
                    setLimit(nextLimit);
                    localStorage.setItem('image_host_limit', String(nextLimit));
                    setPage(1);
                  }}
                >
                  {LIMITS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="image-gallery">
            {imagesLoading && <p className="no-images-msg">Loading images...</p>}
            {!imagesLoading && images.length === 0 && <p className="no-images-msg">No matching images found.</p>}
            {!imagesLoading &&
              images.map((image) => (
                <ImageCard key={image.filename} image={image} onDelete={deleteImage} />
              ))}
          </div>

          <div className="gallery-divider">
            <div className="divider-line"></div>
            <div className="divider-content">
              <i className="fas fa-images"></i>
            </div>
            <div className="divider-line"></div>
          </div>

          <Pagination
            page={page}
            pages={pagination.pages}
            onPrev={() => setPage((value) => Math.max(1, value - 1))}
            onNext={() => setPage((value) => Math.min(pagination.pages, value + 1))}
          />
        </section>
      )}

      {activeTab === 'stats' && (
        <section className="stats-section">
          {statsLoading && <p className="no-images-msg">Loading stats...</p>}
          {!statsLoading && stats && (
            <>
              <div className="dashboard-grid">
                <Metric label="Active Images" value={stats.total_images ?? 0} />
                <Metric label="Storage Used" value={formatFileSize(stats.total_size || 0)} />
                <Metric label="File Types" value={typeCount.length} />
              </div>
              <div className="stats-layout">
                <section className="panel">
                  <div className="panel-header">
                    <h2>Type Distribution</h2>
                  </div>
                  <div className="type-list">
                    {typeCount.length === 0 && <p className="empty-panel-message">No active images.</p>}
                    {typeCount.map((item) => (
                      <div className="type-row" key={item.file_type}>
                        <span>{normalizeFileType(item.file_type)}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-header">
                    <h2>Popular Images</h2>
                  </div>
                  <div className="popular-list">
                    {popular.length === 0 && <p className="empty-panel-message">No views recorded yet.</p>}
                    {popular.map((image) => (
                      <a
                        className="popular-row"
                        key={image.filename}
                        href={`/image-detail?filename=${encodeURIComponent(image.filename)}`}
                      >
                        <img src={imagePath(image.filename)} alt={image.original_name || image.filename} loading="lazy" />
                        <span>{image.original_name || image.filename}</span>
                        <strong>{image.views ?? 0}</strong>
                      </a>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'trash' && (
        <section className="trash-section">
          <div className="trash-header">
            <p className="trash-summary">
              {trashPagination.total} image{trashPagination.total === 1 ? '' : 's'} in trash.
            </p>
            <button
              className="danger-action-btn"
              type="button"
              disabled={trashPagination.total === 0}
              onClick={purgeTrash}
            >
              <i className="fas fa-trash"></i>
              Purge Trash
            </button>
          </div>
          <div className="image-gallery trash-gallery">
            {trashLoading && <p className="no-images-msg">Loading trash...</p>}
            {!trashLoading && trash.length === 0 && <p className="no-images-msg">Trash is empty.</p>}
            {!trashLoading &&
              trash.map((image) => (
                <TrashCard key={image.filename} image={image} onRestore={restoreImage} />
              ))}
          </div>
          <Pagination
            page={trashPage}
            pages={trashPagination.pages}
            onPrev={() => setTrashPage((value) => Math.max(1, value - 1))}
            onNext={() => setTrashPage((value) => Math.min(trashPagination.pages, value + 1))}
          />
        </section>
      )}

      <AppModal dialog={dialog} onClose={closeDialog} />
    </main>
  );
}

interface MetricProps {
  label: string;
  value: string | number;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}

interface PaginationProps {
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
}

function Pagination({ page, pages, onPrev, onNext }: PaginationProps) {
  return (
    <div className="pagination-controls">
      <button className="pagination-btn" type="button" disabled={page <= 1} onClick={onPrev}>
        <i className="fas fa-chevron-left"></i> Previous
      </button>
      <div className="pagination-info">
        Page <span>{page}</span> of <span>{pages || 1}</span>
      </div>
      <button className="pagination-btn" type="button" disabled={page >= pages} onClick={onNext}>
        Next <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}
