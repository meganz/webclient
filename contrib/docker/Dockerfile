FROM --platform=linux/amd64 debian:bookworm

RUN apt-get update && apt-get -y install supervisor nginx curl xz-utils && apt-get clean

COPY contrib/docker/assets/webclient.nginx.conf /etc/nginx/sites-enabled/default
COPY contrib/docker/assets/supervisord.conf /etc/supervisord.conf
RUN curl https://artifactory.developers.mega.co.nz/artifactory/devrepo-generic-local/Linux/Node%20JS/node-v18.0.0-linux-x64.tar.xz --output /root/nodeinstaller.tar.xz
RUN mkdir /root/node && tar xf /root/nodeinstaller.tar.xz -C /root/node --strip-components=1
RUN mv /root/node /usr/local/
ENV PATH="${PATH}:/usr/local/node/bin"

RUN mkdir -p /var/log/supervisord
WORKDIR /var/www/html
COPY . .
RUN npm install --no-progress --no-color

EXPOSE 80
EXPOSE 443

RUN openssl req -x509 -nodes -days 365 -subj "/C=CA/ST=QC/O=Company, Inc./CN=mydomain.com" -addext "subjectAltName=DNS:mydomain.com" -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt;
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisord.conf"]
