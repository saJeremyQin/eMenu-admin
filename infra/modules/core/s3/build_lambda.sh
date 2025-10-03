#!/bin/bash

# Build Lambda deployment package
cd lambda
npm install --production
zip -r ../image_processor.zip .
cd ..