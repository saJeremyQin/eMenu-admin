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
      // 如果你后续要集成 AppSync，可以在这里添加 API 配置
      // API: {
      //   GraphQL: {
      //     endpoint: 'YOUR_APPSYNC_GRAPHQL_ENDPOINT',
      //     region: 'ap-southeast-2',
      //     defaultAuthMode: 'userPool', // 或 'apiKey' 等
      //   },
      // },
    };

    export default awsOutputs;
    