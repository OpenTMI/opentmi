function AddonSample (app, server, io, passport){

	this.name = 'sample addon';
	this.description = 'Just an very simple Example';


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
      var i=0;
      setInterval(function(){
        socket.emit('test', 'test-'+i++);
      }, 1000);
    });
	}



  return this;
}

exports = module.exports = AddonSample;