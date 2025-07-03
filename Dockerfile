# Step 1: Use node to build Vite application
FROM node:20-alpine AS build

# Set Work directory
WORKDIR /app

# Copy dependencies config file
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Build production version（to dist/）
RUN npm run build

# Step 2: Use Nginx to provide static resources services
FROM nginx:alpine AS production

# Change to my config of nginx
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the output before to nginx static directory
COPY --from=build /app/dist /usr/share/nginx/html

# Listen to port 80
EXPOSE 80

# Start Ngnix
CMD ["nginx", "-g", "daemon off;"]
