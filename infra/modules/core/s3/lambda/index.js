import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET;

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing file: ${key}`);

    try {
      // 检查是否是餐厅logo原始文件 - 基于cognitoId的路径结构
      const restaurantLogoMatch = key.match(/^public\/restaurant-logos\/([^\/]+)\/raw\/(.+)$/);
      
      if (!restaurantLogoMatch) {
        console.log('File path does not match restaurant logo pattern, skipping');
        continue;
      }

      const [, cognitoId, filename] = restaurantLogoMatch;
      console.log(`Processing restaurant logo for user: ${cognitoId}, file: ${filename}`);

      // 检查文件类型
      const contentType = await getContentType(bucket, key);
      if (!contentType || !contentType.startsWith('image/')) {
        console.log(`Skipping non-image file: ${key}`);
        continue;
      }

      // 从S3获取原始图片
      const getObjectParams = {
        Bucket: bucket,
        Key: key
      };
      
      const getObjectCommand = new GetObjectCommand(getObjectParams);
      const originalImage = await s3Client.send(getObjectCommand);
      
      // 将流转换为Buffer
      const chunks = [];
      for await (const chunk of originalImage.Body) {
        chunks.push(chunk);
      }
      const imageBuffer = Buffer.concat(chunks);
      
      // 使用Sharp处理图片 - 餐厅logo标准化为300x300
      const processedImageBuffer = await sharp(imageBuffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toBuffer();

      // 生成处理后的文件名，保存到同一个cognitoId下的processed目录
      const fileNameWithoutExt = filename.split('.')[0];
      const processedKey = `public/restaurant-logos/${cognitoId}/processed/${fileNameWithoutExt}.jpg`;

      // 上传处理后的图片
      const putObjectParams = {
        Bucket: bucket,
        Key: processedKey,
        Body: processedImageBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'max-age=31536000', // 1年缓存
        Metadata: {
          'original-key': key,
          'processed-at': new Date().toISOString(),
          'cognito-id': cognitoId
        }
      };

      const putObjectCommand = new PutObjectCommand(putObjectParams);
      await s3Client.send(putObjectCommand);
      console.log(`Successfully processed and saved: ${processedKey}`);

    } catch (error) {
      console.error(`Error processing ${key}:`, error);
      // 不抛出错误，继续处理其他文件
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify('Images processed successfully')
  };
};

async function getContentType(bucket, key) {
  try {
    const headObjectCommand = new HeadObjectCommand({ Bucket: bucket, Key: key });
    const headResult = await s3Client.send(headObjectCommand);
    return headResult.ContentType;
  } catch (error) {
    console.error(`Error getting content type for ${key}:`, error);
    return null;
  }
}