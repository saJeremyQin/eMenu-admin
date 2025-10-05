# Restaurant Logo Upload System Documentation

## Overview

The eMenu restaurant management system includes a sophisticated image upload and processing pipeline designed to handle restaurant logo uploads efficiently. This system leverages AWS cloud services to provide automatic image optimization, secure storage, and seamless integration with the frontend application.

## System Architecture

### Frontend Technology Stack
- **React 18** with functional components and hooks
- **AWS Amplify** for seamless AWS service integration
- **Vite** for modern build tooling and development experience
- **SCSS Modules** for component-scoped styling

### Backend Infrastructure
- **AWS S3** for scalable object storage
- **AWS Lambda** for serverless image processing
- **AWS Cognito** for user authentication and authorization
- **Terraform** for infrastructure as code deployment

## Image Upload Workflow

### 1. File Upload Process
```
User selects image → Frontend validation → Upload to S3 → Lambda processing → Optimized image storage
```

### 2. Storage Structure
```
S3 Bucket: emenu-restaurant-assets-dev/
├── public/
│   └── restaurant-logos/
│       ├── raw/          # Original uploaded files
│       └── processed/    # Lambda-optimized files
```

### 3. Processing Pipeline
1. **Upload Trigger**: User uploads image through React frontend
2. **S3 Event**: File upload triggers Lambda function automatically
3. **Image Processing**: Lambda function processes image using Sharp.js library
4. **Optimization**: Automatic compression, format conversion, and resizing
5. **Storage**: Processed image saved to designated S3 directory
6. **Validation**: Frontend polls for processed image availability
7. **Display**: Optimized image URL returned to frontend for display

## Technical Implementation

### Frontend Upload Component
```javascript
// Core upload functionality in CreateRestaurant.jsx
const handleUpload = async () => {
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const uploadKey = `restaurant-logos/raw/${uniqueFileName}`;
  
  const result = await uploadData({
    key: uploadKey,
    data: selectedFile,
    options: {
      contentType: selectedFile.type
    }
  }).result;
  
  // Trigger processing verification
  await checkImageProcessing(processedKey);
};
```

### Lambda Image Processing Function
```javascript
// Lambda function for image optimization
const sharp = require('sharp');

exports.handler = async (event) => {
  // Process S3 upload event
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  
  // Download original image
  const originalImage = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  
  // Process with Sharp
  const processedImageBuffer = await sharp(originalImage.Body)
    .resize(300, 300, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 })
    .toBuffer();
  
  // Save processed image
  const outputKey = `public/restaurant-logos/processed/${filename}.jpg`;
  await s3.putObject({
    Bucket: bucket,
    Key: outputKey,
    Body: processedImageBuffer,
    ContentType: 'image/jpeg'
  }).promise();
};
```

## Security & Permissions

### Authentication Flow
1. **User Authentication**: AWS Cognito Identity Pool manages user sessions
2. **Temporary Credentials**: Cognito provides temporary AWS credentials
3. **Resource Access**: Users can upload to designated S3 paths only

### S3 Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::emenu-restaurant-assets-dev/public/*"
      ]
    }
  ]
}
```

### Cognito Identity Pool Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::emenu-restaurant-assets-dev/public/restaurant-logos/*"
      ]
    }
  ]
}
```

## Key Features

### Automatic Image Optimization
- **Compression**: Reduces file size while maintaining quality
- **Format Standardization**: Converts all uploads to optimized JPEG format
- **Resize Control**: Ensures consistent dimensions (300x300px for logos)
- **Quality Management**: Balances file size and visual quality (85% JPEG quality)

### Real-time Processing Status
- **Polling Mechanism**: Frontend checks processing status every 2 seconds
- **User Feedback**: Loading indicators and progress messages
- **Error Handling**: Comprehensive error messages for failed uploads
- **Timeout Management**: Maximum 10 retry attempts with graceful degradation

### Scalable Architecture
- **Serverless Processing**: Lambda functions scale automatically with demand
- **Cost Optimization**: Pay-per-use pricing model for processing
- **High Availability**: AWS managed services ensure 99.9% uptime

## Integration with Restaurant Management

### Database Schema Integration
```graphql
type Restaurant {
  id: ID!
  name: String!
  address: String!
  logoUrl: String  # Stores processed image URL
}
```

### Frontend Integration
```javascript
// Restaurant creation with logo upload
const createRestaurant = async () => {
  const restaurantData = {
    name: formData.name,
    address: formData.address,
    logoUrl: uploadedImageUrl  // Processed image URL
  };
  
  await client.graphql({
    query: createRestaurantMutation,
    variables: { input: restaurantData }
  });
};
```

## Performance Considerations

### Upload Optimization
- **Direct S3 Upload**: Bypasses application server for better performance
- **Client-side Validation**: File type and size validation (max 5MB)
- **Progressive Enhancement**: Graceful degradation for slower connections

### Processing Efficiency
- **Sharp.js Library**: High-performance image processing in Node.js
- **Memory Management**: Optimized for Lambda's memory constraints (512MB)
- **Concurrent Processing**: Multiple uploads processed simultaneously

## Monitoring & Troubleshooting

### CloudWatch Integration
- **Lambda Metrics**: Processing time, success/failure rates
- **S3 Metrics**: Upload volumes, storage usage
- **Error Tracking**: Automatic logging of processing failures

### Common Issues & Solutions

#### Issue: 403 Forbidden on Image Access
**Cause**: Path mismatch between frontend expectation and actual file location
**Solution**: Ensure consistent path handling - Lambda saves to `public/` prefix, frontend checks with `public/` prefix

#### Issue: Lambda Processing Timeout
**Cause**: Large image files or insufficient memory allocation
**Solution**: Optimize image processing code or increase Lambda timeout/memory

#### Issue: Amplify API Deprecation Warnings
**Cause**: Using deprecated `getUrl` API in Amplify Storage
**Solution**: Use direct S3 public URLs instead of Amplify's URL generation

## Key Technical Lessons Learned

### Path Consistency Challenge
The most critical aspect of this implementation was ensuring path consistency across all components:

1. **Frontend Upload**: Uses Amplify Storage which may or may not add `public/` prefix
2. **Lambda Processing**: Always saves to `public/restaurant-logos/processed/`
3. **Frontend Verification**: Must check URLs with correct `public/` prefix
4. **S3 Bucket Policy**: Must allow access to the correct path structure

### Solution Pattern
```javascript
// Frontend: Always assume processed files are in public/ directory
const publicUrl = `https://bucket.s3.region.amazonaws.com/public/${processedKey}`;

// Lambda: Always save to public/ directory regardless of input path
const outputKey = `public/restaurant-logos/processed/${filename}.jpg`;
```

## Deployment

### Infrastructure Deployment
```bash
# Deploy infrastructure with Terraform
cd infra/envs/dev
terraform plan
terraform apply
```

### Application Deployment
```bash
# Build and deploy containerized frontend
./deploy.sh dev
```

### Lambda Function Updates
Lambda functions are automatically updated when Terraform detects changes in the source code:
```bash
cd infra/modules/core/s3
zip -r image_processor.zip lambda/
cd ../../envs/dev
terraform apply
```

## Future Enhancements

### Planned Improvements
- **Multiple Image Formats**: Support for PNG, WebP formats
- **CDN Integration**: CloudFront distribution for global image delivery
- **Image Variants**: Generate multiple sizes for responsive design
- **Metadata Extraction**: Store image dimensions, creation date
- **Bulk Upload**: Support for multiple restaurant images

### Scalability Considerations
- **Database Optimization**: Implement image metadata caching
- **Processing Queue**: Add SQS for handling high-volume uploads
- **Geographic Distribution**: Multi-region deployment for global users

## Testing Strategy

### Unit Testing
- Frontend upload component testing
- Lambda function processing logic
- Error handling scenarios

### Integration Testing
- End-to-end upload workflow
- Permission and security testing
- Performance testing with various image sizes

### Manual Testing Checklist
- [ ] Upload various image formats (JPEG, PNG, GIF)
- [ ] Test file size limits (5MB maximum)
- [ ] Verify processed image quality and dimensions
- [ ] Check permission boundaries
- [ ] Test error scenarios (network issues, invalid files)

## Conclusion

The restaurant logo upload system demonstrates a modern, cloud-native approach to handling user-generated content. By leveraging AWS services and serverless architecture, the system provides a scalable, secure, and cost-effective solution for restaurant logo management within the eMenu platform.

The implementation showcases best practices in:
- **Security**: Fine-grained IAM permissions and secure file handling
- **Performance**: Automatic image optimization and efficient processing
- **User Experience**: Real-time feedback and seamless integration
- **Maintainability**: Infrastructure as code and comprehensive monitoring

This architecture serves as a foundation for additional image upload features across the eMenu platform, including dish images, user avatars, and promotional content.

---

*Last updated: October 4, 2025*  