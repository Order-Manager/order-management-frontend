FROM node:20-alpine AS build-stage
# "production" uses the orders-server project, "development" uses orders-server-dev
ARG BUILD_MODE=production
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --mode $BUILD_MODE

FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html/orders
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
