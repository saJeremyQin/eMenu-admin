// Configure Amplify as a side effect of importing this module.
// main.jsx must import this FIRST: ES imports are hoisted and evaluated in order,
// so calling Amplify.configure() in main.jsx's body would run only after App.jsx
// and every page (several call generateClient() at module load) had been evaluated.
import { Amplify } from 'aws-amplify';
import awsOutputs from './aws-config.js';

Amplify.configure(awsOutputs);
