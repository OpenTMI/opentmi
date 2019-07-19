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
curl https://admin:admin@localhost:3000/api/v0/events
```

**NOTE:** Do not use this when plain HTTP is in use!

### Signup new user

This is not needed when user login using github authentication.

```
POST /auth/signup
```


### Get authenticated user information

```
GET /auth/me

{ groups: [],
  apikeys: [],
  _id: '<string>',
  name: '<string>',
  email: '<string>',
  registered: '<iso-date>',
  lastVisited: '<iso-date>'
}
```

### Update user information

TBD
```
PUT /auth/me
```

### Log out

```
POST /auth/logout
```

