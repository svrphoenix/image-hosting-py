'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageItem } from '../types';
import { formatDate, formatFileSize, imagePath, normalizeFileType } from '../lib';

interface ImageCardProps {
  image: ImageItem;
  onDelete: (filename: string) => void;
}

export default function ImageCard({ image, onDelete }: ImageCardProps) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}${imagePath(image.filename)}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <article className="image-card">
      <Link className="image-card-preview" href={`/image-detail?filename=${encodeURIComponent(image.filename)}`}>
        <img src={imagePath(image.filename)} alt={image.original_name || image.filename} loading="lazy" />
      </Link>
      <div className="image-card-info">
        <h3 className="image-card-title" title={image.filename}>
          {image.original_name || image.filename}
        </h3>
        <p className="image-card-url" title={`${typeof window !== 'undefined' ? window.location.origin : ''}${imagePath(image.filename)}`}>
          {`${typeof window !== 'undefined' ? window.location.origin : ''}${imagePath(image.filename)}`}
        </p>
        <div className="image-card-meta">
          <span><i className="fas fa-eye"></i> {image.views ?? 0}</span>
          <span>{formatFileSize(image.size)}</span>
          <span>{normalizeFileType(image.file_type).toUpperCase()}</span>
        </div>
        <p className="image-card-date">{formatDate(image.upload_time)}</p>
        <div className="image-card-actions">
          <button className="copy-url-btn" type="button" onClick={copyUrl}>
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
          <button className="card-delete-btn" type="button" onClick={() => onDelete(image.filename)} aria-label="Delete image">
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </article>
  );
}
