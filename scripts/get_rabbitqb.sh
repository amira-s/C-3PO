#!/bin/bash

# https://www.rabbitmq.com/install-debian.html

echo 'deb http://www.rabbitmq.com/debian/ testing main' |
     sudo tee /etc/apt/sources.list.d/rabbitmq.list

wget -O- https://www.rabbitmq.com/rabbitmq-release-signing-key.asc | sudo apt-key add -

sudo apt-get update
sudo apt-get install rabbitmq-server

if [ $? == 1 ]; then
  echo 'If you get a warning about unmet dependencies, run the command'
  echo '"sudo apt-get -f install"'
  echo 'then run "sudo apt-get install rabbitmq-server" again'
else
  echo 'RabbitMQ installed, start server with:'
  echo '"sudo rabbitmq-server"'
  echo 'Close server with:'
  echo '"sudo rabbitmqctl stop"'
fi
