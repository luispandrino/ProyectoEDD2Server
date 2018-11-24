var express = require('express');
var bodyParser = require('body-parser');
const mongoose = require('mongoose');
var Pusher = require('pusher');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var pusher = new Pusher({
    appId: '653821',
    key: 'c83c4aa3faaa3f673bf7',
    secret: 'd095919d77a6dcfe6cbf',
    cluster: 'us2',
  });

mongoose.connect('mongodb://luipa:luispandrino1997@ds039037.mlab.com:39037/edd2proyectochat', { useNewUrlParser: true });

const Schema = mongoose.Schema;
const userSchema = new Schema({
    name: { type: String, required: true, },
    password: {type: String, required: true},
    count: {type: Number}
  });
var User = mongoose.model('User', userSchema);


const MessageSchema = new Schema({
    namesender: { type: String, required: true, },
    message: {type: String, required: true},
    count: {type: Number}
  });
var message = mongoose.model('Message',MessageSchema)


userSchema.pre('save', function(next) {
    if (this.isNew) {
        User.count().then(res => {
          this.count = res; // Increment count
          next();
        });
      } else {
        next();
      }
});


MessageSchema.pre('save', function(next) {
    if (this.isNew) {
        message.count().then(res => {
          this.count = res; // Increment count
          next();
        });
      } else {
        next();
      }
});

// make this available to our users in our Node applications
module.exports = User;
module.exports = message;
var currentUser;


app.post('/login', (req, res) => {
    const myModel = mongoose.model('User');
    myModel.findOne({ name: req.body.name, password:req.body.password }, function (err, user) {
        if (err) {
            res.send("Error user not found");
        }
        if (user) {
            // user exists already
            currentUser = user;
            currentUser.password = req.body.password
            res.status(200).send(user)
        } else {
            // create new user
            var newuser = new User({
                name: req.body.name,
                password: req.body.password
              });
            newuser.save(function(err) {
                if (err) throw err;
                console.log('User saved successfully!');
            });
            currentUser = newuser;
            res.status(200).send(newuser)
        }
    });

})


// fetch all users
app.get('/users', (req, res) => {
    User.find({}, function(err, users) {
        if (err) throw err;
        // object of all the users
        res.send(users);
      });
})

// authenticate users for the presence channel
app.post('/pusher/auth/presence', (req, res) => {
    var socketId = req.body.socket_id;
    var channel = req.body.channel_name;
    var presenceData = {
      user_id: currentUser._id,
      user_info: {count: currentUser.count, name: currentUser.name}
    };

    res.send(pusher.authenticate(socketId, channel, presenceData));
});

// authenticate users for the private channel
app.post('/pusher/auth/private', (req, res) => {
    res.send(pusher.authenticate(req.body.socket_id, req.body.channel_name));
});

app.post('/send-message', (req, res) => {
    pusher.trigger(req.body.channel_name, 'new-message', {message: req.body.message,sender_id: req.body.sender_id});
    res.sendStatus(200);
    var newmessage = new message({
        namesender: req.body.sender_id,
        message: req.body.message
      });
    newmessage.save(function(err) {
        if (err) throw err;
    });
    console.log('mensaje enviado!');
});

var port = process.env.PORT || 5000;
app.listen(port);
console.log("Server is up");
