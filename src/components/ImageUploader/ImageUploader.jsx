import React, { useState, useRef } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import backendConfig from '../../config/backend-config';
import styles from './ImageUploader.module.scss';

/**
 * Built-in upload function: presign -> PUT to S3 -> poll for processed image -> return public URL
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Progress callback (currently unused, kept for API compatibility)
 * @param {string} imageType - 'dish-image' or 'restaurant-logo' (determines which S3 bucket)
 * @returns {Promise<string>} - Public URL of the processed image
 */
async function builtInUploadFn(file, onProgress, imageType) {
  try {
    const now = () => new Date().toISOString();
    console.log(`[ImageUploader.builtInUploadFn] starting upload for file=${file.name}, imageType=${imageType} at ${now()}`);
    
    const currentUser = await getCurrentUser();
    const session = await fetchAuthSession({ forceRefresh: false });
    const token = session.tokens?.idToken?.toString();
    if (!token) throw new Error('Unable to get authentication token');

    const lambdaUrl = backendConfig.presignedUrlGenerator;
    const presignPayload = { authToken: token, fileName: file.name, contentType: file.type, imageType };
    console.log('[ImageUploader.builtInUploadFn] presign request payload:', presignPayload, 'at', now());
    
    const presignResp = await fetch(lambdaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(presignPayload)
    });
    console.log('[ImageUploader.builtInUploadFn] presign response status:', presignResp.status, 'at', now());
    
    if (!presignResp.ok) {
      const err = await presignResp.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get presigned URL');
    }
    
    const responseData = await presignResp.json();
    const { presignedUrl, s3Key, expectedProcessedKey, s3Bucket } = responseData;
    console.log('[ImageUploader.builtInUploadFn] presign response body:', { presignedUrl, s3Key, expectedProcessedKey, s3Bucket }, 'at', now());

    const uploadResponse = await fetch(presignedUrl, { 
      method: 'PUT', 
      headers: { 'Content-Type': file.type }, 
      body: file 
    });
    console.log('[ImageUploader.builtInUploadFn] upload completed with status:', uploadResponse.status, 'for s3Key:', s3Key, 'at', now());
    
    if (!uploadResponse.ok) throw new Error('Failed to upload file to S3');

    // Poll for processed file: 3 total attempts at 2s interval
    const maxAttempts = 3;
    let attempts = 0;
    
    // Use bucket returned by presign generator, with fallback based on imageType
    const fallbackBucket = imageType === 'restaurant-logo' 
      ? backendConfig.restaurantAssetsBucket 
      : backendConfig.dishImagesBucket;
    const bucketForPublic = s3Bucket || fallbackBucket;
    const publicUrl = `https://${bucketForPublic}.s3.${backendConfig.s3Region}.amazonaws.com/${expectedProcessedKey}`;
    
    // Wait before first check
    await new Promise((res) => setTimeout(res, 2000));
    console.log('[ImageUploader.builtInUploadFn] begin polling for processed object at', publicUrl, 'at', now());
    
    while (attempts < maxAttempts) {
      try {
        const attemptNum = attempts + 1;
        const head = await fetch(publicUrl, { method: 'HEAD' });
        console.log(`[ImageUploader.builtInUploadFn] HEAD attempt ${attemptNum} status=${head.status} at ${now()}`);
        
        if (head.ok) {
          console.log('[ImageUploader.builtInUploadFn] processed object available at', publicUrl, 'at', now());
          return publicUrl;
        }
      } catch (e) {
        console.log('[ImageUploader.builtInUploadFn] HEAD attempt error:', e, 'at', now());
      }
      attempts += 1;
      await new Promise((res) => setTimeout(res, 2000));
    }
    
    console.log('[ImageUploader.builtInUploadFn] image processing timeout after attempts=', attempts, 'at', now());
    throw new Error('Image processing timeout');
  } catch (err) {
    console.error('[ImageUploader.builtInUploadFn] error:', err);
    throw err;
  }
}

/**
 * ImageUploader component with built-in S3 upload support
 * @param {Object} props
 * @param {string|null} props.imageUrl - Current image URL to display
 * @param {Function} props.onUpload - Callback when upload completes (receives public URL)
 * @param {string} props.accept - File input accept attribute (default: 'image/*')
 * @param {number} props.maxSizeMB - Max file size in MB (default: 5)
 * @param {string} props.imageType - 'dish-image' or 'restaurant-logo' (determines S3 bucket)
 * @param {Function} props.uploadFn - Optional custom upload function (overrides built-in logic)
 * @param {number} props.previewSize - Preview box size in pixels (default: 200)
 * @param {boolean} props.showButtons - Show upload button (default: true)
 * @param {string} props.className - Additional CSS class
 */
export default function ImageUploader({
  imageUrl = null,
  onUpload,
  accept = 'image/*',
  maxSizeMB = 5,
  imageType = 'dish-image', // 'dish-image' | 'restaurant-logo'
  uploadFn = null, // optional override
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
      // Use custom uploadFn if provided, otherwise use built-in logic
      const finalUploadFn = uploadFn || ((f, onProg) => builtInUploadFn(f, onProg, imageType));
      const url = await finalUploadFn(file, (p) => {});
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