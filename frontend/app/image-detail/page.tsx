'use client';

import { useCallback, useEffect, useMemo, useState, Suspense, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppModal from '../components/AppModal';
import { apiRequest, formatDate, formatFileSize, imagePath, normalizeFileType } from '../lib';
import { DialogOptions, ImageItem } from '../types';

function useDialog() {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  
  const openDialog = useCallback((options: DialogOptions) => new Promise<boolean>((resolve) => {
    setDialog({ ...options, resolve });
  }), []);
  
  const closeDialog = useCallback((result: boolean = false) => {
    if (dialog?.resolve) dialog.resolve(result);
    setDialog(null);
  }, [dialog]);

  return {
    dialog,
    closeDialog,
    confirmDialog: (options: Omit<DialogOptions, 'showCancel' | 'resolve'>) => openDialog({ ...options, showCancel: true }),
    messageDialog: (options: Omit<DialogOptions, 'showCancel' | 'resolve'>) => openDialog({ ...options, showCancel: false })
  };
}

function ImageDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dialog, closeDialog, confirmDialog, messageDialog } = useDialog();
  
  const filename = searchParams.get('filename') || '';
  const [image, setImage] = useState<ImageItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!filename) {
      setLoading(false);
      setError('No image specified. Please provide a valid filename parameter.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    apiRequest<ImageItem>(`/images/${encodeURIComponent(filename)}`)
      .then((data) => {
        if (!cancelled) {
          setImage(data);
          document.title = `${data.original_name || data.filename} - Image Details`;
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || 'The requested image could not be found or has been deleted.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filename]);

  const directUrl = useMemo(() => {
    if (!image) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${imagePath(image.filename)}`;
  }, [image]);

  const deleteImage = async () => {
    if (!image) return;

    const confirmed = await confirmDialog({
      title: 'Move to Trash',
      message: `Move "${image.original_name || image.filename}" to trash? You can restore it later from the Trash tab.`,
      confirmText: 'Move to Trash',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await apiRequest(`/images/${encodeURIComponent(image.filename)}`, { method: 'DELETE' });
      router.push('/upload?tab=images');
    } catch (deleteError: any) {
      await messageDialog({ title: 'Delete Failed', message: deleteError.message, confirmText: 'Close', variant: 'danger' });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadImage = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = imagePath(image.filename);
    link.download = image.original_name || image.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <main className="detail-page">
        <Header />
        <div className="loading-container">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-pulse fa-3x"></i>
          </div>
          <p className="loading-text">Loading image details...</p>
        </div>
      </main>
    );
  }

  if (error || !image) {
    return (
      <main className="detail-page">
        <Header />
        <div className="error-container">
          <div className="error-content">
            <i className="fas fa-exclamation-triangle fa-3x" style={{ color: '#FF6B6B', marginBottom: '20px' }}></i>
            <h2>Image Not Found</h2>
            <p className="error-message">{error || 'The requested image could not be found or has been deleted.'}</p>
            <Link href="/upload?tab=images" className="error-back-btn">
              <i className="fas fa-home"></i>
              Return to Gallery
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="detail-page">
      <Header />
      <div className="main-content">
        <section className="image-preview-section">
          <div className="image-container">
            <div className="image-wrapper">
              <img src={imagePath(image.filename)} alt={image.original_name || image.filename} />
              <div className="image-overlay">
                <button className="fullscreen-btn" type="button" onClick={() => setFullscreen(true)} title="View fullscreen">
                  <i className="fas fa-expand"></i>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="image-info-section">
          <div className="info-container">
            <InfoCard title="Basic Information" icon="fas fa-info-circle">
              <InfoRow label="Filename" value={image.filename} />
              <InfoRow label="Original Name" value={image.original_name} />
              <InfoRow label="File Size" value={formatFileSize(image.size)} />
              <InfoRow label="File Type" value={normalizeFileType(image.file_type)} />
              <InfoRow label="Upload Date" value={formatDate(image.upload_time, true)} />
              <InfoRow label="Views" value={image.views ?? 0} />
              <InfoRow label="ID" value={image.id} />
            </InfoCard>

            <InfoCard title="Actions" icon="fas fa-cog">
              <div className="action-buttons">
                <button className="action-btn primary" type="button" onClick={copyToClipboard}>
                  <i className={copied ? "fas fa-check" : "fas fa-copy"}></i>
                  <span>{copied ? 'Copied!' : 'Copy URL'}</span>
                </button>
                <button className="action-btn secondary" type="button" onClick={downloadImage}>
                  <i className="fas fa-download"></i>
                  <span>Download</span>
                </button>
                <button className="action-btn danger" type="button" onClick={deleteImage}>
                  <i className="fas fa-trash-alt"></i>
                  <span>Delete</span>
                </button>
              </div>
            </InfoCard>

            <InfoCard title="Direct URL" icon="fas fa-link">
              <div className="url-container">
                <input type="text" value={directUrl} readOnly />
                <button className="url-copy-btn" type="button" onClick={copyToClipboard} title="Copy direct link">
                  <i className={copied ? "fas fa-check" : "fas fa-copy"}></i>
                </button>
              </div>
            </InfoCard>
          </div>
        </section>
      </div>

      {fullscreen && (
        <div className="fullscreen-modal" onMouseDown={(event) => event.target === event.currentTarget && setFullscreen(false)}>
          <div className="fullscreen-overlay">
            <button className="fullscreen-close" type="button" onClick={() => setFullscreen(false)}>
              <i className="fas fa-times"></i>
            </button>
            <div className="fullscreen-content">
              <img src={imagePath(image.filename)} alt={image.original_name || image.filename} />
            </div>
          </div>
        </div>
      )}

      <AppModal dialog={dialog} onClose={() => closeDialog()} />
    </main>
  );
}

export default function ImageDetailPage() {
  return (
    <Suspense fallback={<div className="loading-container">Loading page...</div>}>
      <ImageDetailContent />
    </Suspense>
  );
}

function Header() {
  return (
    <header className="header-nav">
      <div className="nav-content">
        <Link href="/upload?tab=images" className="back-btn">
          <i className="fas fa-arrow-left"></i>
          <span>Back to Gallery</span>
        </Link>
        <h1 className="page-title">Image Details</h1>
        <div className="nav-spacer" />
      </div>
    </header>
  );
}

interface InfoCardProps {
  title: string;
  icon?: string;
  children: ReactNode;
}

function InfoCard({ title, icon, children }: InfoCardProps) {
  return (
    <div className="info-card">
      <div className="card-header">
        {icon && <i className={icon}></i>}
        <h3>{title}</h3>
      </div>
      <div className="card-content">{children}</div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value?: string | number;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="info-row">
      <span className="info-label">{label}:</span>
      <span className="info-value">{value || '-'}</span>
    </div>
  );
}
