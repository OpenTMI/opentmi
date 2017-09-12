# Short instructions how to use docker for OpenTMI

OpenTMI container uses mongo docker container for database connections. You have to compile and run it as well, see [mongo][#mongo] section more about it.

# Docker for OpenTMI

## Build container
```
$ docker build -t opentmi/opentmi .
```

# Run OpenTMI from container
```
$ docker run --name opentmi -p 8080:3000 --link mongo:mongo -d opentmi/opentmi
```


# mongo

## To build and run mongo from container
```
docker pull mongo:latest
docker run -v "$(pwd)":/data --name mongo -d mongo mongod --smallfiles
```
