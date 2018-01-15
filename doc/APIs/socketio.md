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

`/` default namespace

`/admin` admin namespace

`/results` results namespace

Usage example:
```
const options = { query: `token=${token}` };
const client = IO(`${host}/results`, options);
client.emit(event, (error, data) => { });
```

### API's

All query -kind of API's based on socketIO callback mechanism.


### Default namespace

#### Who Am I
```
io.emit('whoami', (error, data) => {
    // data will contains user information
});
```

### Admin namespace



### Results namespace

When client connects to `results` namespace
it can listen all new results which other clients uploads to backend.

#### New result

Event: `new` is sent by backend when new result are stored. `result`
argument contains json object without logs -property which is
dropped just for performance reasons. See example:
```
io.on('new', (result) => {
   console.log(result);
});
```
