import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import backendConfig from '../../config/backend-config';
import styles from './CreateRestaurant.module.scss';

const client = generateClient();

const CreateRestaurant = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // 验证文件大小 (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      
      // 创建预览URL
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setProcessing(false);
    
    try {
      // 获取当前用户和认证 token（直接从 User Pool 获取，避免 Identity Pool）
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession({ forceRefresh: false });
      
      // 直接获取 User Pool 的 ID token，不使用 Identity Pool 凭证
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('Unable to get authentication token');
      }

      console.log('User Pool sub (persistent ID):', currentUser.userId);

      // 调用 eMenu-backend 的预签名 URL Lambda 函数
      const lambdaUrl = backendConfig.presignedUrlGenerator;
      console.log('Using Lambda URL:', lambdaUrl);
      
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authToken: token,
          fileName: selectedFile.name,
          contentType: selectedFile.type
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to get presigned URL');
      }

      const responseData = await response.json();
      console.log('Success response:', responseData);
      
      const { presignedUrl, s3Key, expectedProcessedKey } = responseData;
      
      console.log('Got presigned URL for key:', s3Key);

      // 使用预签名 URL 直接上传到 S3
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
        },
        body: selectedFile
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      console.log('Upload successful to key:', s3Key);
      
      // 设置处理状态
      setProcessing(true);
      
      // 等待 Lambda 处理图片
      setTimeout(() => {
        checkImageProcessing(expectedProcessedKey);
      }, 3000);
      
      alert('Image uploaded successfully! Processing in background...');

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const checkImageProcessing = async (processedKey, attempts = 0) => {
    if (attempts > 10) {
      setProcessing(false);
      alert('Image processing is taking longer than expected. You can still create the restaurant.');
      return;
    }

    try {
      // processedKey 已经包含完整路径，直接构建 S3 公共 URL
      const publicUrl = backendConfig.getS3PublicUrl(processedKey);
      
      console.log('Checking URL:', publicUrl);
      
      // 检查URL是否可访问
      const response = await fetch(publicUrl, { method: 'HEAD' });
      if (response.ok) {
        // 图片处理完成
        setProcessing(false);
        console.log('Image processing completed');
        setUploadedImageUrl(publicUrl);
      } else {
        throw new Error('Image not ready');
      }
    } catch (error) {
      // 图片还在处理中，继续等待
      console.log(`Attempt ${attempts + 1}: Image not ready yet, retrying in 2 seconds...`);
      setTimeout(() => {
        checkImageProcessing(processedKey, attempts + 1);
      }, 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address || !formData.phone) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // 获取当前用户信息
      const user = await getCurrentUser();
      
      // 创建餐厅的 GraphQL mutation
      const createRestaurantMutation = `
        mutation CreateRestaurant($input: RestaurantInput!) {
          createRestaurant(input: $input) {
            id
            name
            address
            phone
            image
            bossId
          }
        }
      `;

      const restaurantData = {
        input: {
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          image: uploadedImageUrl || null
        }
      };

      console.log('Creating restaurant with data:', restaurantData);

      const result = await client.graphql({
        query: createRestaurantMutation,
        variables: restaurantData
      });

      console.log('Restaurant created:', result.data.createRestaurant);

      alert('Restaurant created successfully!');
      navigate('/restaurant/info');
      
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to create restaurant. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
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
          
          <div className={styles.imagePreview}>
            {(previewUrl || uploadedImageUrl) ? (
              <img 
                src={uploadedImageUrl || previewUrl} 
                alt="Restaurant logo preview" 
                className={styles.previewImage}
              />
            ) : (
              <div className={styles.placeholderImage}>
                <span>No image selected</span>
              </div>
            )}
            
            {processing && (
              <div className={styles.processingOverlay}>
                <span>Processing...</span>
              </div>
            )}
          </div>

          <div className={styles.uploadButtons}>
            <button
              type="button"
              onClick={handleFileSelect}
              className={styles.selectButton}
            >
              Select Image
            </button>
            
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={styles.uploadButton}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          
          <p className={styles.uploadNote}>
            Supported formats: JPG, PNG, GIF. Max size: 5MB
            <br />
            Images will be automatically resized to 300x300px
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