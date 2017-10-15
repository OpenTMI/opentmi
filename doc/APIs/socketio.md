## SocketIO

### Authentication

To use socketIO connection you have to use token. 
To get token call [login](authentication.md) rest API.

Usage example:
```
const options = {
    query: `token=${token}`
};
const client = IO(host, options);
```

### Namespaces

`/` default room

`/admin` admin room

### API's

All query -kind of API's based on socketIO callback mechanism.

#### Who Am I
```
io.emit('whoami', (error, data) => {
    // data will contains user information
});
```