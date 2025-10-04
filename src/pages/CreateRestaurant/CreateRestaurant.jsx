import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadData } from 'aws-amplify/storage';
import { v4 as uuidv4 } from 'uuid';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import styles from './CreateRestaurant.module.scss';

const client = generateClient();

const CreateRestaurant = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: ''
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
      // 生成唯一文件名
      const fileExtension = selectedFile.name.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const rawKey = `restaurant-logos/raw/${uniqueFileName}`;

      console.log('Uploading to key:', rawKey);

      // 使用Amplify Storage API上传到S3
      const result = await uploadData({
        key: rawKey,
        data: selectedFile,
        options: {
          contentType: selectedFile.type,
          metadata: {
            'upload-timestamp': new Date().toISOString(),
            'original-name': selectedFile.name
          }
        }
      }).result;

      console.log('Upload successful:', result);
      console.log('Actual uploaded key:', result.key);

      // 确定实际的上传路径（Amplify可能会添加public/前缀）
      const actualUploadedKey = result.key;
      const isPublicPath = actualUploadedKey.startsWith('public/');
      
      // 从实际上传的路径中提取文件名（不含扩展名）
      const actualFileName = actualUploadedKey.split('/').pop();
      const actualFileNameWithoutExt = actualFileName.split('.')[0];
      
      // 根据实际上传路径构建处理后的路径
      let processedKey;
      if (isPublicPath) {
        // 如果上传到了public/restaurant-logos/raw/，处理后应该在public/restaurant-logos/processed/
        processedKey = `public/restaurant-logos/processed/${actualFileNameWithoutExt}.jpg`;
      } else {
        // 如果上传到了restaurant-logos/raw/，处理后应该在restaurant-logos/processed/
        processedKey = `restaurant-logos/processed/${actualFileNameWithoutExt}.jpg`;
      }

      console.log('Expected processed key:', processedKey);
      console.log('Is public path:', isPublicPath);
      console.log('Actual filename without ext:', actualFileNameWithoutExt);

      // 设置处理状态
      setProcessing(true);
      
      // 轮询检查处理是否完成
      setTimeout(() => {
        checkImageProcessing(processedKey);
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
      // 直接构建S3的公共URL（因为我们已经设置了公共读取权限）
      const publicUrl = `https://emenu-restaurant-assets-dev.s3.ap-southeast-2.amazonaws.com/${processedKey}`;
      
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
    
    if (!formData.name || !formData.address) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // 获取当前用户信息
      const user = await getCurrentUser();
      
      // 这里你需要根据你的AppSync schema来调整GraphQL mutation
      // 例如：
      /*
      const createRestaurantMutation = `
        mutation CreateRestaurant($input: CreateRestaurantInput!) {
          createRestaurant(input: $input) {
            id
            name
            address
            logoUrl
            ownerId
          }
        }
      `;

      const restaurantData = {
        name: formData.name,
        address: formData.address,
        logoUrl: uploadedImageUrl,
        ownerId: user.userId
      };

      const result = await client.graphql({
        query: createRestaurantMutation,
        variables: { input: restaurantData }
      });
      */

      // 临时输出数据，你需要替换为实际的GraphQL mutation
      console.log('Restaurant data to be saved:', {
        name: formData.name,
        address: formData.address,
        logoUrl: uploadedImageUrl,
        ownerId: user.userId
      });

      alert('Restaurant created successfully!');
      navigate('/restaurants');
      
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