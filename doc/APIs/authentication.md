## Authentication

OpenTMI provides multiple authentication strategies:
* github OAuth
* jwt
* Local username/password
* basic authentication

To get JWT authorization token you have to use some of above login methods:


### Login using username and password
```
POST /auth/login
body: {username: <username>, password: <password>}
response: {token: <token>}
```

### Login using github OAuth

```
POST /auth/github
GET /auth/github/id get github client id
```


### Basic authentication

Client can include username and password to http request like:
```
curl http://admin:admin@localhost:3000/api/v0/events
```

**NOTE:** Do not use this when plain HTTP is in use!

### Signup new user

This is not needed when user login using github authentication.

```
POST /auth/signup
```

```
GET /auth/me
PUT /auth/me
POST /auth/logout
```

