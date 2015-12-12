var Hapi = require('hapi');
var Good = require('good');
var Inert = require('inert');
var Vision = require('vision');
var Hoek = require('hoek');
var Cookie = require('hapi-auth-cookie');
var Path = require('path');
var Jade = require('jade');
var Mongoose = require('mongoose');
var Model = require('./model');

//----------------------------------------DATABASE

Mongoose.connect('mongodb://admin:admin@ds027505.mongolab.com:27505/techtest');

var db = Mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
	console.log('connected to remote mogodb');
});

//------------------------------------------SERVER

var server = new Hapi.Server();

server.connection({ port: 8080 });

//Inert is for static content, cookie is for authentication
server.register([Inert, Cookie], function (err) {
	if (err) {
		throw err;
	}

	server.auth.strategy('session', 'cookie', {
		password: 'password',
		cookie: 'cookie',
		isSecure: false
	});

	server.auth.default('session');

	//Routing
    server.route({
        method: 'GET',
        path: '/',
    	config: {
    		auth: {
    			mode: 'optional'
    		},
	        handler: function (request, reply) {
	        	
	        	if (request.auth.isAuthenticated) {
	        		reply.redirect('/user');
	        	}
	        	else {
	            	reply.view('login', {success: null});
	            }
	        }
	    }
    });

    server.route({
    	method: 'GET',
    	path: '/logout',
    	config: {
    		auth: {
    			mode: 'optional'
    		},
	    	handler: function (request, reply) {

	    		request.auth.session.clear();
	    		
	    		reply.redirect('/');
	    	}
	    }
    });

    server.route({
    	method: 'POST',
    	path: '/login',
    	config: {
    		auth: {
    			mode: 'optional'
    		},
	    	handler: function (request, reply) {

	    		var user = request.payload;
	    		
	    		Model.findUser(user, function (err, data) {

	    			if (err === null && data === null) {
	    				reply.view('login', {fail: 'fail'});
	    			}
	    			else if (data === false) { 
	    				reply.view('login', {fail: 'fail'});
	    			}
	    			else {

	    				var profile = {
	    					id: data._id,
	    					username: data.username,
	    					firstName: data.firstName,
	    					lastName: data.lastName,
	    					email: data.email
	    				};

	    				request.auth.session.set(profile);
	    				reply.redirect('/user');
	    			}
	    		});
	    	}
   		}
    });

    server.route({
        method: 'GET',
        path: '/register',
        config: {
        	auth: {
        		mode: 'optional'
        	},
	        handler: function (request, reply) {
	            reply.view('register');
	        }
	    }
    });

    server.route({
    	method: 'POST',
    	path: '/register',
    	config: {
    		auth: {
    			mode: 'optional'
    		},
	    	handler: function (request, reply) {

	    		var user = request.payload;

	    		Model.addUser(user, function (err, data) {

	    			if (data !== null) {
	    				reply.view('login', {success: 'success'});
	    			}
	    			else {
	    				reply.view('register', {fail: 'fail'});
	    			}
	    		});
	    	}
	    }
    });

    server.route({
    	method: 'GET',
    	path: '/user',
    	config: {
    		auth: {
    			strategy: 'session'
    		},
	    	handler: function (request, reply) {
	    		
	    		var profile = request.auth.credentials;

	    		var user = {
	    			username: profile.username,
	    			firstName: profile.firstName,
	    			lastName: profile.lastName,
	    			email: profile.email
	    		};
	    		reply.view('user', {user: user, myusername: profile.username} );
	    	}
	    }
    });

    server.route({
    	method: 'POST',
    	path: '/user',
    	config: {
    		auth: {
    			strategy: 'session'
    		},
    		handler: function (request, reply) {

			var profile = request.auth.credentials;
			var update = request.payload;

			profile.firstName = update.firstName;
			profile.lastName = update.lastName;
			profile.email = update.email;

			request.auth.session.set(profile);
			Model.updateUser(profile.username, update, function (err, data) {
				reply.redirect("/user");
			});
    		}
    	}
    });

    server.route({
    	method: 'GET',
    	path: '/friends',
    	config: {
    		auth: {
    			strategy: 'session'
    		},
	    	handler: function (request, reply) {

	    		var profile = request.auth.credentials;

	    		Model.findAllFriends(profile.username, function(err, friendlist) {
	    			reply.view('friends', {friendlist: friendlist, myusername: profile.username} );
	    		});
	    	}
	    }
    });

    server.route({
    	method: 'POST',
    	path: '/friends',
    	config: {
    		auth: {
    			strategy: 'session'
    		},
    		handler: function (request, reply) {

    			var profile = request.auth.credentials;

    			var f = request.payload.friends;

	    		Model.findFriend(f, function(err, friend) {

	    			if (profile.username === f) {
	    				reply.view('friends', {epicfail: 'fail'});
	    			} else if(friend === null) {
	    				reply.view('friends', {fail: 'fail'});
	    			}
	    			else
	    			{
		    			Model.addFriend(profile.username, friend, function(err, data) {
		    				reply.redirect('/friends');
		    			});
	    			}
	    		});
    		}
    	}
    });

    server.route({
    	method: 'POST',
    	path: '/delete/friend',
    	config: {
    		auth: {
    			strategy: 'session'
    		},
    		handler: function (request, reply) {

    			var profile = request.auth.credentials;
    			var friend = request.payload.del;

    			Model.deleteFriend(profile.username, friend, function (err, data) {
    				reply.redirect('/friends');
    			});

    		}
    	}
    });

    server.route({
        method: 'GET',
        path: '/css/{param*}',
        config: {
        	auth: {
        		mode: 'optional'
        	},
	        handler: {
	        	directory: { path: Path.normalize(__dirname + '/css/') }
	        }
	    }
    });

});

//For Jade templates
server.register(Vision, function (err) {

	Hoek.assert(!err, err);

	server.views({
		engines: {
			jade: Jade
		},
		relativeTo: __dirname,
		path: './views'
	});
});

//Start server and process monitoring
server.register({
    register: Good,
    options: {
        reporters: [{
            reporter: require('good-console'),
            events: {
                response: '*',
                log: '*'
            }
        }]
    }
}, function (err) {
    if (err) {
        throw err;
    }

    server.start(function () {
        server.log('info', 'Server running at: ' + server.info.uri);
    });
});