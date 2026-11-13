# Pendências da Fábrica — PHP-FPM (usado pelo docker-compose)
FROM php:8.3-fpm-alpine

RUN docker-php-ext-install pdo_sqlite opcache

WORKDIR /var/www/html
COPY . .

# o banco vive fora da imagem (volume "dados") e precisa ser gravável
RUN mkdir -p data && chown -R www-data:www-data data

EXPOSE 9000
CMD ["php-fpm"]
