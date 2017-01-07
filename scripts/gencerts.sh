#!/bin/bash

echo create sslcert folder
mkdir -p sslcert
echo generate certifications
openssl req -x509 -newkey rsa:2048 -keyout sslcert/server.key -out sslcert/server.crt -days 365 -nodes
echo ready.
