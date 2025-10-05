
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
          identityPoolId: 'ap-southeast-2:f7b49d7b-d653-4a5f-9dd6-07bd42e4d763',
        },
      },
      API: {
        GraphQL: {
          endpoint: 'https://h4pqvuqsw5dklkaexrf7ugesam.appsync-api.ap-southeast-2.amazonaws.com/graphql',
          region: 'ap-southeast-2',
          defaultAuthMode: 'userPool', // 或 'apiKey' 等
        },
      },
      Storage: {
        S3: {
          bucket: 'emenu-restaurant-assets-dev',
          region: 'ap-southeast-2',
        },
      },
    };

    export default awsOutputs;
    