'use client';

import { ImageItem } from '../types';
import { formatDate, formatFileSize, imagePath, normalizeFileType } from '../lib';

interface TrashCardProps {
  image: ImageItem;
  onRestore: (filename: string) => void;
}

export default function TrashCard({ image, onRestore }: TrashCardProps) {
  return (
    <article className="image-card">
      <div className="image-card-preview">
        <img src={imagePath(image.filename)} alt={image.original_name || image.filename} loading="lazy" />
      </div>
      <div className="image-card-info">
        <h3 className="image-card-title" title={image.filename}>
          {image.original_name || image.filename}
        </h3>
        <div className="image-card-meta">
          <span>{formatFileSize(image.size)}</span>
          <span>{normalizeFileType(image.file_type)}</span>
        </div>
        <p className="image-card-date">Deleted {formatDate(image.deleted_at)}</p>
        <div className="image-card-actions">
          <button className="restore-btn" type="button" onClick={() => onRestore(image.filename)}>
            <i className="fas fa-undo"></i>
            Restore
          </button>
        </div>
      </div>
    </article>
  );
}
