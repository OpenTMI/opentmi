function AddonSample (app, server, io, passport){

	this.register = function(){
    app.get('/test', function(req, res){
		  res.json({ok: 1});
		});

    io.on('connection', function (socket) {
      console.log('someone are there! :)');
      socket.emit('test', 'hello client');
      socket.on('hello', function(data){
        console.log(data);
      });
      socket.broadcast.emit('test', 'broadcast msg!');
      socket.emit('test', 'hello-world');
    });
	}
  return this;
}

exports = module.exports = AddonSample;