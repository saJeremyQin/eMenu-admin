
import { signUp } from "aws-amplify/auth";

    // 您的 AWS Cognito 配置 (适用于 Amplify v6+)
    const awsOutputs = {
      Auth: {
        Cognito: {
          userPoolId: 'ap-southeast-2_2WdKaZBr3',
          userPoolClientId: '40nv3qru4flrlbcjftgq7qd7q0',
          region: 'ap-southeast-2',
          signUpAttributes: ['EMAIL'],
          verificationMechanisms: ['EMAIL'],
        },
      },
      API: {
        GraphQL: {
          endpoint: 'https://bg3tjhivtnajvanipkiujecj6q.appsync-api.ap-southeast-2.amazonaws.com/graphql',
          region: 'ap-southeast-2',
          defaultAuthMode: 'userPool', // 或 'apiKey' 等
        },
      },
    };

    export default awsOutputs;
    