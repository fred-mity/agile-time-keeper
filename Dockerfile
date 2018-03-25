# Deploy static HTML Website as Container
FROM nginx:alpine

LABEL maintainer="Frederic Faure <frederik.faure@gmail.com> (https://github.com/Zolenas)"

WORKDIR /usr/share/nginx/html

COPY . .

