function AddonSample (app, passport){

	this.name = 'sample addon';
	this.description = 'Just an very simple Example';

	this.register = function(){
		app.get('/test', function(req, res){
		res.json({ok: 1});
		});
	}



  return this;
}

exports = module.exports = AddonSample;