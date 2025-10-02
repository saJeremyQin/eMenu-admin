
import { signUp } from "aws-amplify/auth";

    // 您的 AWS Cognito 配置 (适用于 Amplify v6+)
    const awsOutputs = {
      Auth: {
        Cognito: {
          userPoolId: 'ap-southeast-2_QJtyPfP6J',
          userPoolClientId: '2pshheuhdc0tlh7te6vjcip89v',
          region: 'ap-southeast-2',
          signUpAttributes: ['EMAIL'],
          verificationMechanisms: ['EMAIL'],
        },
      },
      API: {
        GraphQL: {
          endpoint: 'https://h4pqvuqsw5dklkaexrf7ugesam.appsync-api.ap-southeast-2.amazonaws.com/graphql',
          region: 'ap-southeast-2',
          defaultAuthMode: 'userPool', // 或 'apiKey' 等
        },
      },
    };

    export default awsOutputs;
    