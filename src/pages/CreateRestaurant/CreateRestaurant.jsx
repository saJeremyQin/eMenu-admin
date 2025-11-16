import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import ImageUploader from '../../components/ImageUploader/ImageUploader';
import backendConfig from '../../config/backend-config';
import styles from './CreateRestaurant.module.scss';
import { useDispatch } from 'react-redux';
import { setRestaurant, fetchRestaurant, updateRestaurantField } from '../../store/restaurantSlice';
import { updateUserField } from '../../store/userSlice';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';

const client = generateClient();

const CreateRestaurant = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: ''
  });
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [reconciling, setReconciling] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // uploadFn will be passed to ImageUploader; it does presign -> upload -> poll processed key -> return public URL
  const uploadFn = async (file, onProgress) => {
    // onProgress is currently unused but kept for API compatibility
    try {
      const now = () => new Date().toISOString();
      console.log(`[CreateRestaurant.uploadFn] starting upload for file=${file.name} at ${now()}`);
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession({ forceRefresh: false });
      const token = session.tokens?.idToken?.toString();
      if (!token) throw new Error('Unable to get authentication token');

      const lambdaUrl = backendConfig.presignedUrlGenerator;
      const presignPayload = { authToken: token, fileName: file.name, contentType: file.type, imageType: 'restaurant-logo' };
      console.log('[CreateRestaurant.uploadFn] presign request payload:', presignPayload, 'at', now());
      const presignResp = await fetch(lambdaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presignPayload)
      });
      console.log('[CreateRestaurant.uploadFn] presign response status:', presignResp.status, 'at', now());
      if (!presignResp.ok) {
        const err = await presignResp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get presigned URL');
      }

  const responseData = await presignResp.json();
  const { presignedUrl, s3Key, expectedProcessedKey, s3Bucket } = responseData;
  console.log('[CreateRestaurant.uploadFn] presign response body:', { presignedUrl, s3Key, expectedProcessedKey, s3Bucket }, 'at', now());

      const uploadResponse = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      console.log('[CreateRestaurant.uploadFn] upload completed with status:', uploadResponse.status, 'for s3Key:', s3Key, 'at', now());
      if (!uploadResponse.ok) throw new Error('Failed to upload file to S3');

      // Poll for processed file
      // Match DishesPage polling: 3 total attempts (1 initial + 2 retries) at 2s interval
      const maxAttempts = 3;
      let attempts = 0;
      // Use the bucket returned by the presign generator to construct the public URL.
      const bucketForPublic = s3Bucket || backendConfig.restaurantAssetsBucket;
      const publicUrl = `https://${bucketForPublic}.s3.${backendConfig.s3Region}.amazonaws.com/${expectedProcessedKey}`;
          // wait a short delay before first check
      await new Promise((res) => setTimeout(res, 2000));
      console.log('[CreateRestaurant.uploadFn] begin polling for processed object at', publicUrl, 'at', now());
      while (attempts < maxAttempts) {
        try {
          const attemptNum = attempts + 1;
          const head = await fetch(publicUrl, { method: 'HEAD' });
          console.log(`[CreateRestaurant.uploadFn] HEAD attempt ${attemptNum} status=${head.status} at ${now()}`);
          if (head.ok) {
            console.log('[CreateRestaurant.uploadFn] processed object available at', publicUrl, 'at', now());
            // store for create-case so UI can reference the processed public URL
            setUploadedImageUrl(publicUrl);
            return publicUrl;
          }
        } catch (e) {
          console.log('[CreateRestaurant.uploadFn] HEAD attempt error:', e, 'at', now());
          // ignore and retry
        }
        attempts += 1;
        // wait 2 seconds between attempts
        await new Promise((res) => setTimeout(res, 2000));
      }
      console.log('[CreateRestaurant.uploadFn] image processing timeout after attempts=', attempts, 'at', now());
      throw new Error('Image processing timeout');
    } catch (err) {
      console.error('[CreateRestaurant.uploadFn] error:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address || !formData.phone) {
      alert('Please fill in all required fields');
      return;
    }

    try {    
      // 创建餐厅的 GraphQL mutation
        const createRestaurantMutation = `
          mutation CreateRestaurant($input: RestaurantInput!) {
            createRestaurant(input: $input) {
              id
              name
              address
              phone
              logoUrl
              bossId
            }
          }
        `;

        const restaurantData = {
          input: {
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            // send `logoUrl` to match backend schema
            logoUrl: uploadedImageUrl || null
          }
        };

      console.log('Creating restaurant with data:', restaurantData);

      const result = await client.graphql({
        query: createRestaurantMutation,
        variables: restaurantData
      });

      const created = result?.data?.createRestaurant;
      console.log('Restaurant created:', created);
      if (created) {
        // update redux store so guards/routes reflect new restaurant immediately
        dispatch(setRestaurant(created));
        // proactively set loaded=true so route guards and pages render immediately
        // even if the background fetch fails or is slow.
        dispatch(updateRestaurantField({ key: 'loaded', value: true }));
        // ensure the current user's restaurantId matches the newly created restaurant
        // to avoid guard-based redirects when user.restaurantId is stale.
        dispatch(updateUserField({ key: 'restaurantId', value: created.id }));
        alert('Restaurant created successfully!');
        // show a small loading while we reconcile with server before navigating
        setReconciling(true);
        try {
          // trigger a refresh to reconcile with server and wait for it
          await dispatch(fetchRestaurant()).unwrap();
        } catch (e) {
          // still proceed, but warn
          console.warn('fetchRestaurant after create failed:', e);
        } finally {
          setReconciling(false);
          navigate('/restaurant/info');
        }
      } else {
        alert('Restaurant created but response missing data; please refresh.');
      }
      
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to create restaurant. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      {reconciling && <LoadingOverlay label="Finalizing restaurant setup..." />}
      <h1>Create Restaurant</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="name">Restaurant Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="Enter restaurant name"
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="address">Address *</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            required
            placeholder="Enter restaurant address"
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="phone">Phone Number *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
            placeholder="Enter phone number"
          />
        </div>

        <div className={styles.logoSection}>
          <h3>Restaurant Logo</h3>

          <ImageUploader
            imageUrl={uploadedImageUrl}
            uploadFn={uploadFn}
            onUpload={(url) => setUploadedImageUrl(url)}
            accept="image/*"
            maxSizeMB={5}
            previewSize={300}
          />

          <p className={styles.uploadNote}>
            Supported formats: JPG, PNG, GIF. Max size: 5MB
            <br />
            Images will be automatically resized and processed in background.
          </p>
        </div>

        <div className={styles.submitSection}>
          <button type="submit" className={styles.submitButton}>
            Create Restaurant
          </button>
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRestaurant;