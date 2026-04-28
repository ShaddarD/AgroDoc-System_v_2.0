FROM node:20-alpine AS build
WORKDIR /workspace
COPY shared-ui/package.json shared-ui/package-lock.json ./shared-ui/
WORKDIR /workspace/shared-ui
RUN npm ci
WORKDIR /workspace
COPY shared-ui/styles/theme.css shared-ui/styles/theme.css
COPY shared-ui/styles/shell.css shared-ui/styles/shell.css
COPY shared-ui/src shared-ui/src
COPY frontend-admin/package.json frontend-admin/package-lock.json ./frontend-admin/
WORKDIR /workspace/frontend-admin
RUN npm ci
COPY frontend-admin/ ./
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY frontend-admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/frontend-admin/dist /usr/share/nginx/html
EXPOSE 80
