    // src/aws-config.js

    // 您的 AWS Cognito 配置 (适用于 Amplify v6+)
    const awsOutputs = {
      Auth: {
        Cognito: {
          userPoolId: 'ap-southeast-2_0a2hzDvRi',
          userPoolClientId: '232fs0ql6m9mjlr79aariv29c3',
          region: 'ap-southeast-2',
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
    