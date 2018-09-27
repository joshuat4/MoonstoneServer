const functions = require('firebase-functions');
//Use this to deploy functions
//firebase deploy --only functions

const admin = require('firebase-admin');
var request = require('request');
admin.initializeApp();

// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.addMessage = functions.https.onRequest((req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  return admin.database().ref('/messages').push({original: original}).then((snapshot) => {
    // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    return res.redirect(303, snapshot.ref.toString());
  });
});

exports.messageNotification = functions.firestore
	.document('users/{userId}/contacts/{contactId}/messages/{messageId}')
	.onCreate((snap, context) => {

		const receiverId = context.params.userId;
		console.log("receiverId: ", receiverId);

		const message = snap.data().text;
		console.log("message: ", message);

		const messageId = context.params.messageId;
		console.log("messageId: ", messageId);

		const senderId = snap.data().fromUserId;
		console.log("fromUserId: ", senderId);


		if (senderId.toString() === receiverId.toString()){
			console.log("no notification sent, as message from target");
		} else {

      return admin.firestore().collection("users").doc(senderId).get().then(queryResult => {

    		const fromUser = admin.firestore().collection("users").doc(senderId).get();
    		const toUser = admin.firestore().collection("users").doc(receiverId).get();

    		return Promise.all([fromUser, toUser]).then(result => {
    			const senderName = result[0].data().name;
    			const receiverToken = result[1].data().deviceToken;

    			const notificationContent = {
    				notification: {
              title: 'Text from ' + senderName,
            	body: message,
    					icon: "default"
    				}
    			};

    			return admin.messaging().sendToDevice(receiverToken, notificationContent);
    		});
    	});
    }
  });


function returnData(imageURL, description, coord) {
    this.imageURL = imageURL;
    this.description = description;
    this.coord = coord;
}

function  bearing(lat1,lng1,lat2,lng2) {
            var dLon = _toRad(lng2-lng1);
            var y = Math.sin(dLon) * Math.cos(_toRad(lat2));
            var x = Math.cos(_toRad(lat1))*Math.sin(_toRad(lat2)) - Math.sin(_toRad(lat1))*Math.cos(_toRad(lat2))*Math.cos(dLon);
            var brng = _toDeg(Math.atan2(y, x));
            return ((brng + 360) % 360);
}

function _toRad(deg) {
           return deg * Math.PI / 180;
      }

function _toDeg(rad) {
          return rad * 180 / Math.PI;
      }
//strip <b> tags from html
function strip(html)
      {
      html = html.replace(/<b>/g, "");
      html = html.replace(/<\/b>/g, "");
      html = html.replace(/<(?:.|\n)*?>/gm, "");
      return html;
      }



// Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
exports.makeUppercase = functions.database.ref('/messages/{pushId}/original')
    .onCreate((snapshot, context) => {
      // Grab the current value of what was written to the Realtime Database.
      const original = snapshot.val();
      console.log('Uppercasing', context.params.pushId, original);
      const uppercase = original.toUpperCase();
      // You must return a Promise when performing asynchronous tasks inside a Functions such as
      // writing to the Firebase Realtime Database.
      // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
      return snapshot.ref.parent.child('uppercase').set(uppercase);
    });

exports.mapRequest = functions.https.onRequest((req,res) => {
  //Process request
  var input = req.query.text;
  var split = input.split("---");

  var convertRoute = "https://maps.googleapis.com/maps/api/geocode/json?address=";
  var conFirst = convertRoute + split[0] + "&key=AIzaSyB48bubXS-1ArBemvhzNL0d6_7-hFvyivg";
  var conSecond = convertRoute + split[1]+ "&key=AIzaSyB48bubXS-1ArBemvhzNL0d6_7-hFvyivg";

  //Convert both requested locations to the closest match as per googles geocoding API
  request(conFirst, function(error, response, body) {
    var start = JSON.parse(body).results[0].formatted_address;
    request(conSecond, function(error, response, body){
      var end = JSON.parse(body).results[0].formatted_address;
      var routeURL = "https://maps.googleapis.com/maps/api/directions/json?origin=" + start + "&destination=" + end + "&mode=walking";
      //https://maps.googleapis.com/maps/api/directions/json?origin='228 Mott, New York, NY'&destination='102 St Marks Pl, New York, NY&mode=walking

      request(routeURL, function (error, response, body) {
        var ob = JSON.parse(body);
        var location_array = [ob.routes[0].legs[0].steps[0].start_location, ob.routes[0].legs[0].steps[0].end_location];
        var description_array = [strip(ob.routes[0].legs[0].steps[0].html_instructions)];
        var i;
      for (i = 1; i < ob.routes[0].legs[0].steps.length; i++) {
          location_array.push(ob.routes[0].legs[0].steps[i].end_location);
          description_array.push(strip(ob.routes[0].legs[0].steps[i].html_instructions));
      }
      var shot_array = [];
      var bearing_array = [];

      for(i=0; i < location_array.length-1; i++){
        var bear = bearing(location_array[i].lat, location_array[i].lng, location_array[i+1].lat, location_array[i+1].lng);
        bearing_array.push(bear);
      }

      //Generate return data
      var data = [];
      for(i=0; i<location_array.length; i++){
        var dataPoint;
        var streetURL;
        //Should point at the place
        if(i === location_array.length-1){
          //Show a streetview shot of the actual place
          streetURL = "https://maps.googleapis.com/maps/api/streetview?size=600x300&location=" + split[1];
          dataPoint = new returnData(streetURL,"Welcome to your destination", location_array[i]);
          data.push(dataPoint);

        }
        else{
          streetURL = "https://maps.googleapis.com/maps/api/streetview?size=600x300&location=" + String(location_array[i].lat) + "," + String(location_array[i].lng) + "&heading=" + bearing_array[i] + "&pitch=-0.76";
          dataPoint = new returnData(streetURL, description_array[i], location_array[i]);
          data.push(dataPoint);
        }
      }
      res.json(data);
        });
    });
  });
});

exports.getWholeDatabase = functions.https.onRequest((req, res) => {
   // Grab the text parameter.
   const original = req.query.text;

   admin
      .database()
      .ref('/messages')
      .once('value',
          snap =>  res.json(snap.val()),
          err => res.json(err)
      )
})
