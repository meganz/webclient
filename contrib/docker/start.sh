#!/usr/bin/env bash
cd "${0%/*}"
cd ../..
echo "Client Directory: $(pwd)"

addhost() {
    grep -qxF "127.0.0.1 $1" /etc/hosts || echo "127.0.0.1 $1" | sudo tee -a /etc/hosts
}
addhost "webclient.local"
for i in {1..9}
do
    addhost "$i.webclient.local"
done

# Start services.
sudo docker compose --file ./contrib/docker/docker-compose.yml up --detach "$@"
