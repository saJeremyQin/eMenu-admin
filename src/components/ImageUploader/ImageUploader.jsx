import React, { useState, useRef } from 'react';
import styles from './ImageUploader.module.scss';

async function defaultUploadFn(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.imageUrl;
}

export default function ImageUploader({
  imageUrl = null,
  onUpload,
  accept = 'image/*',
  maxSizeMB = 5,
  uploadFn = defaultUploadFn,
  previewSize = 200,
  showButtons = true,
  className = ''
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(imageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  function handleSelect(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > maxSizeMB * 1024 * 1024) {
      setError(`Max file size ${maxSizeMB}MB`);
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const url = await uploadFn(file, (p) => {});
      setPreview(url);
      setFile(null);
      onUpload && onUpload(url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${styles.uploader} ${className}`}>
      <div className={styles.previewWrap} style={{ width: previewSize, height: previewSize }}>
        {preview ? (
          <>
            <img src={preview} alt="preview" className={styles.preview} />
            {loading && (
              <div className={styles.processingOverlay}>
                <div className={styles.processingText}>Processing...</div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.noImage}>No image</div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className={styles.hiddenInput}
        onChange={handleSelect}
      />

      <div className={styles.buttonRow}>
        <button type="button" className={styles.selectButton} onClick={() => inputRef.current.click()}>
          Select Image
        </button>

        {showButtons && (
          <button
            type="button"
            className={styles.uploadButton}
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        )}
      </div>

      <div className={styles.hintText}>
        Supported: JPG/PNG. Max {maxSizeMB}MB. Images processed in background.
      </div>

      {error && <div className={styles.errorText}>{error}</div>}
    </div>
  );
}