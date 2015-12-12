var Mongoose = require("mongoose");
var Schema = Mongoose.Schema;
var Bcrypt = require('bcrypt');
SALT_WORK_FACTOR = 10;

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

module.exports = {
    User: User
};