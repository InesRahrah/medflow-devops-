# Build Angular
FROM node:22 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Serveur Web
FROM nginx:alpine

COPY --from=build /app/dist/e-health_template/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx","-g","daemon off;"]
