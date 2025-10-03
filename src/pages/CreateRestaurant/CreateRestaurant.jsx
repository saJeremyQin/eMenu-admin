import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
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
      // 获取当前用户的AWS凭证
      const session = await fetchAuthSession();
      const credentials = session.credentials;
      
      if (!credentials) {
        throw new Error('Unable to get AWS credentials');
      }

      // 动态导入AWS SDK v3
      const { S3Client, PutObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
      
      // 创建S3客户端
      const s3Client = new S3Client({
        region: 'ap-southeast-2',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      // 生成唯一文件名
      const fileExtension = selectedFile.name.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const rawKey = `restaurant-logos/raw/${uniqueFileName}`;
      const processedKey = `restaurant-logos/processed/${uuidv4()}.jpg`;

      // 上传到S3的raw文件夹
      const uploadCommand = new PutObjectCommand({
        Bucket: 'emenu-restaurant-assets-dev',
        Key: rawKey,
        Body: selectedFile,
        ContentType: selectedFile.type,
        Metadata: {
          'upload-timestamp': new Date().toISOString(),
          'original-name': selectedFile.name
        }
      });

      await s3Client.send(uploadCommand);
      console.log('Upload successful');

      // Lambda会自动处理图片，生成处理后的URL
      const processedUrl = `https://emenu-restaurant-assets-dev.s3.ap-southeast-2.amazonaws.com/${processedKey}`;
      
      setUploadedImageUrl(processedUrl);
      setProcessing(true);
      
      // 轮询检查处理是否完成
      setTimeout(() => {
        checkImageProcessing(processedKey, s3Client);
      }, 3000);
      
      alert('Image uploaded successfully! Processing in background...');
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const checkImageProcessing = async (processedKey, s3Client, attempts = 0) => {
    if (attempts > 10) {
      setProcessing(false);
      alert('Image processing is taking longer than expected. You can still create the restaurant.');
      return;
    }

    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      
      const headCommand = new HeadObjectCommand({
        Bucket: 'emenu-restaurant-assets-dev',
        Key: processedKey
      });
      
      await s3Client.send(headCommand);
      
      // 图片处理完成
      setProcessing(false);
      console.log('Image processing completed');
      
      // 更新显示的图片URL
      const processedUrl = `https://emenu-restaurant-assets-dev.s3.ap-southeast-2.amazonaws.com/${processedKey}`;
      setUploadedImageUrl(processedUrl);
      
    } catch (error) {
      // 图片还在处理中，继续等待
      setTimeout(() => {
        checkImageProcessing(processedKey, s3Client, attempts + 1);
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