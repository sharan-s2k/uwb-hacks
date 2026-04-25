#!/bin/sh
set -e

# Digital Ocean sets PORT; default to 8080
export PORT=${PORT:-8080}

# Inject PORT into nginx config
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec supervisord -c /etc/supervisord.conf
