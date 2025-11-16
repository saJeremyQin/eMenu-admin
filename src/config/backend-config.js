/**
 * eMenu-backend 资源配置
 * 这些资源现在通过 Terraform remote state 自动获取
 */

const backendConfig = {
  // 从环境变量读取（由 Terraform 注入到 ECS 任务中）
  presignedUrlGenerator: import.meta.env.VITE_PRESIGNED_URL_GENERATOR || 
    'https://luullooeikq64igsyvdrxtctxa0wwwjt.lambda-url.ap-southeast-2.on.aws/', // fallback
  
  restaurantAssetsBucket: import.meta.env.VITE_S3_BUCKET_NAME || 
    'emenu-restaurant-assets-dev', // fallback
  
  // Dish images bucket (separate from restaurant logos). Injected as VITE_DISH_IMAGES_BUCKET
  dishImagesBucket: import.meta.env.VITE_DISH_IMAGES_BUCKET ||
    'emenu-dish-images-dev',
  
  s3Region: 'ap-southeast-2',
  
  // 构建 S3 公共 URL 的帮助函数
  getS3PublicUrl: (key) => {
    // Prefer dish images bucket if available (used for dish images). Fall back to restaurant assets bucket.
    const bucket = backendConfig.dishImagesBucket || backendConfig.restaurantAssetsBucket;
    return `https://${bucket}.s3.${backendConfig.s3Region}.amazonaws.com/${key}`;
  }
};

export default backendConfig;