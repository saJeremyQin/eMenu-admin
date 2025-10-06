
import { signUp } from "aws-amplify/auth";

    // 您的 AWS Cognito 配置 (适用于 Amplify v6+)
    const awsOutputs = {
      Auth: {
        Cognito: {
          userPoolId: 'ap-southeast-2_Mw4J3zNoQ',
          userPoolClientId: '4l90vqi7nfam318ci1tml91j3n',
          region: 'ap-southeast-2',
          signUpAttributes: ['EMAIL'],
          verificationMechanisms: ['EMAIL'],
          identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || 
            'ap-southeast-2:0bd2c82e-0ca9-4ca0-b2d8-2526e18bc364', // 从 Terraform 获取的新 ID
        },
      },
      API: {
        GraphQL: {
          endpoint: 'https://h4pqvuqsw5dklkaexrf7ugesam.appsync-api.ap-southeast-2.amazonaws.com/graphql',
          region: 'ap-southeast-2',
          defaultAuthMode: 'userPool', // 或 'apiKey' 等
        },
      },
      // Storage 配置已移除，因为文件上传现在通过 eMenu-backend 的 Lambda 函数处理
    };

    export default awsOutputs;
    