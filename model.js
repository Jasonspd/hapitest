var User = require('./schema').User;

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

module.exports = {
	addUser: addUser,
	findUser: findUser,
	findFriend: findFriend,
	addFriend: addFriend,
	findAllFriends: findAllFriends,
	updateUser: updateUser,
	deleteFriend: deleteFriend
};