FROM nginx:mainline-alpine AS setup-stage

ARG FRONTEND_USERNAME
ARG FRONTEND_PASSWORD
ARG BASEDOMAIN
ARG CROSSORIGINDOMAIN
RUN apk add openssl
RUN if [[ ! -f "/etc/letsencrypt/live/${BASEDOMAIN}/privkey.pem" ]]; then \
    echo "No certificate found, generating self signed. Could be overridden by mount later on container creating."; \
    mkdir -p "/etc/letsencrypt/live/${BASEDOMAIN}"; \
    openssl req -new -newkey rsa:4096 -days 3650 -nodes -x509 \
    -subj "/C=US/ST=NC/L=Local/O=Dev/CN=${BASEDOMAIN}" \
    -addext "subjectAltName=DNS:${BASEDOMAIN}, DNS:${CROSSORIGINDOMAIN}" \
    -keyout "/etc/letsencrypt/live/${BASEDOMAIN}/privkey.pem" \
    -out "/etc/letsencrypt/live/${BASEDOMAIN}/fullchain.pem"; \
fi;

RUN echo "creating htaccess with ${FRONTEND_USERNAME}:${FRONTEND_PASSWORD}"
RUN apk add apache2-utils
RUN htpasswd -b -c /etc/nginx/conf.d/.htpasswd "$FRONTEND_USERNAME" "$FRONTEND_PASSWORD"


RUN echo "Using proxy.conf.template"
COPY default.conf.template /etc/nginx/templates/default.conf.template

