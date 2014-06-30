

module.exports = function(app) {
  app.get('/api/', test);
};

function test(req, res, next) {
	res.type('json');
	res.jsonp({success:true,value:"hello world"});
}