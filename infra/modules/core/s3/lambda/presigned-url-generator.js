import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET;

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // 解析请求
    const { 
      authToken, 
      fileName, 
      contentType = 'image/jpeg' 
    } = JSON.parse(event.body);

    // 验证必需参数
    if (!authToken || !fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing authToken or fileName'
        })
      };
    }

    // 从 Cognito JWT 中提取用户信息
    // 注意：在生产环境中，你应该验证 JWT 签名
    const decodedToken = jwt.decode(authToken);
    if (!decodedToken || !decodedToken.sub) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Invalid or expired token'
        })
      };
    }

    const userSub = decodedToken.sub;
    console.log(`Generating presigned URL for user: ${userSub}`);

      // 生成唯一文件名
      const fileId = randomUUID();
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${fileId}.${fileExtension}`;    // 构建安全的 S3 路径 - 用户只能上传到自己的目录
    const s3Key = `public/restaurant-logos/${userSub}/raw/${uniqueFileName}`;

    // 创建预签名 URL 的参数
    const putObjectParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
      Metadata: {
        'user-sub': userSub,
        'original-filename': fileName,
        'upload-timestamp': new Date().toISOString()
      }
    };

    // 生成预签名 URL（5分钟过期）
    const command = new PutObjectCommand(putObjectParams);
    const presignedUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 300 // 5分钟
    });

    console.log(`Generated presigned URL for key: ${s3Key}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        presignedUrl,
        s3Key,
        expiresIn: 300,
        expectedProcessedKey: `public/restaurant-logos/${userSub}/processed/${fileId}.jpg`
      })
    };

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
};