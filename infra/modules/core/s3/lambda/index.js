const AWS = require('aws-sdk');
const sharp = require('sharp');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET;

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing file: ${key}`);

    try {
      // 只处理raw文件夹中的图片
      if (!key.startsWith('restaurant-logos/raw/')) {
        console.log('Skipping file not in raw folder');
        continue;
      }

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
      
      const originalImage = await s3.getObject(getObjectParams).promise();
      
      // 使用Sharp处理图片
      const processedImageBuffer = await sharp(originalImage.Body)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toBuffer();

      // 生成处理后的文件名
      const fileName = key.split('/').pop();
      const fileNameWithoutExt = fileName.split('.')[0];
      const processedKey = `restaurant-logos/processed/${fileNameWithoutExt}.jpg`;

      // 上传处理后的图片
      const putObjectParams = {
        Bucket: bucket,
        Key: processedKey,
        Body: processedImageBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'max-age=31536000', // 1年缓存
        Metadata: {
          'original-key': key,
          'processed-at': new Date().toISOString()
        }
      };

      await s3.putObject(putObjectParams).promise();
      console.log(`Successfully processed and saved: ${processedKey}`);

      // 可选：删除原始文件以节省存储空间
      await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
      console.log(`Deleted original file: ${key}`);

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
    const headResult = await s3.headObject({ Bucket: bucket, Key: key }).promise();
    return headResult.ContentType;
  } catch (error) {
    console.error(`Error getting content type for ${key}:`, error);
    return null;
  }
}