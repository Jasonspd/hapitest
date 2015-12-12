var Hapi = require('hapi');
var Good = require('good');
var Inert = require('inert');
var Vision = require('vision');
var Hoek = require('hoek');
var Cookie = require('hapi-auth-cookie');
var Path = require('path');
var Jade = require('jade');
var Joi = require('joi');
var Mongoose = require('mongoose');
var Bcrypt = require('bcrypt');
SALT_WORK_FACTOR = 10;

//----------------------------------------DATABASE

Mongoose.connect('mongodb://admin:admin@ds027505.mongolab.com:27505/techtest');

var db = Mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
	console.log('connected to database' + db);
});

var Schema = Mongoose.Schema;

var userSchema = new Schema({
	username: {type: String, required: true, index: {unique: true}},
	firstName: String,
	lastName: String,
	email: {type: String, required: true, index: {unique: true}},
	password: {type: String, required: true},
	friends: Array
});

userSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    Bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        Bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
    Bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

var User = Mongoose.model('User', userSchema);

//-----------------------------------------------------> Models

var addUser = function (data, callback) {

	var newUser = new User(data);

	User.create(newUser, function (err, user) {

		if (err) {
			return callback(err, null);
		}
		else {
			return callback(null, user);
		}
	});
};

var findUser = function (data, callback) {

	var query = {username: data.username};

	User.findOne(query, function (err, user) {

		if (user === null) {
			return callback(err, null);
		}
		else {
			user.comparePassword(data.password, function(err, isMatch) {
			    if (err) throw err;
			    console.log('Password is:', isMatch);
			    if (isMatch === false) {
			    	return callback(err, null);
			    }
			    else {
					return callback(null, user);
			    }
			});
		}
	});
};

var findFriend = function (data, callback) {

	var query = {username: data};

	User.findOne(query, function (err, data) {

		if (err) {
			return callback(err, null);
		}
		else {
			return callback(null, data);
		}
	});
};

var addFriend = function (user, friend, callback) {

	var query = {username: user};
	var f = friend.username;
	var update = { $push: { "friends": f } };

	User.findOneAndUpdate(query, update, function (err, data) {

		if (err) {
			return callback(err, null);
		}
		else {
			return callback(null, data);
		}
	});	
};

var findAllFriends = function (data, callback) {
	
	var query = { username: data };

	User.findOne(query, function (err, data) {
		
		if (err) {
			return callback(err, null);
		} else {
			return callback(null, data);
		}
	});
};

var updateUser = function (data, update, callback){
 	
	var query = { username: data };

	User.findOneAndUpdate(query, update, function (err, data) {

		if (err) {
			return callback(err, null);
		}
		else {
			return callback(null, data);
		}
	});
};

var deleteFriend = function (user, friend, callback) {

	var query = { username: user };
	var remove = { $pull: { "friends": friend } };

	User.findOneAndUpdate(query, remove, function (err, data) {

		if (err) {
			return callback(err, null);
		}
		else {
			return callback(null, data);
		}
	});
};


//------------------------------------------Joi

var joiSchema = Joi.object().keys({
	username: Joi.string().alphanum().min(3).max(30).required(),
	email: Joi.string().email()
});

//------------------------------------------SERVER

var server = new Hapi.Server();

server.connection({ port: 8080 });

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

    server.route({
        method: 'GET',
        path: '/',
    	config: {
    		auth: {
    			mode: 'optional'
    		},
	        handler: function (request, reply) {
	        	console.log(request.auth, 'homepage');
	        	
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
	    		findUser(user, function (err, data) {

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
	    		console.log(request.payload);
	    		var user = request.payload;

	    		addUser(user, function (err, data) {
	    			console.log(data, 'post request');

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
	    		var u = request.auth.credentials;
	    		console.log(u);
	    		var user = {
	    			username: u.username,
	    			firstName: u.firstName,
	    			lastName: u.lastName,
	    			email: u.email
	    		};
	    		reply.view('user', {user: user, myusername: u.username} );
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
			updateUser(profile.username, update, function (err, data) {
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
	    		var myusername = request.auth.credentials.username;

	    		findAllFriends(myusername, function(err, friendlist) {
	    			console.log(friendlist);
	    			reply.view('friends', {friendlist: friendlist, myusername: myusername} );
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

    			var myusername = request.auth.credentials.username;

    			var f = request.payload.friends;

	    		findFriend(f, function(err, friend) {

	    			if (myusername === f) {
	    				reply.view('friends', {epicfail: 'fail'});
	    			} else if(friend === null) {
	    				reply.view('friends', {fail: 'fail'});
	    			}
	    			else
	    			{
		    			addFriend(myusername, friend, function(err, data) {
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
    			console.log(friend, 'who my friend is');
    			deleteFriend(profile.username, friend, function (err, data) {
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

