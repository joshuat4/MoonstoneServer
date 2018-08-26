const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });


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

  var routeURL = "https://maps.googleapis.com/maps/api/directions/json?origin=" + split[0] + "&destination=" + split[1] + "&mode=walking";
  //https://maps.googleapis.com/maps/api/directions/json?origin='228 Mott, New York, NY'&destination='102 St Marks Pl, New York, NY&mode=walking

  request(routeURL, function (error, response, body) {
    var ob = JSON.parse(body);
    var location_array = [ob.routes[0].legs[0].steps[0].start_location, ob.routes[0].legs[0].steps[0].end_location];
    var i;
  for (i = 1; i < ob.routes[0].legs[0].steps.length; i++) {
      location_array.push(ob.routes[0].legs[0].steps[i].end_location);
  }
  var shot_array = [];
  var bearing_array = [];
  //Get bearings
  for(i=0; i < location_array.length-1; i++){
    //MIGHT HAVE TO PARSE
    var lat_dif = (location_array[i+1].lat - location_array[i].lat) * 0.85;
    var lon_div = (location_array[i+1].lng - location_array[i].lng) * 0.85;
    shot_array.push((location_array[i].lat + lat_dif), (location_array[i].lng + lon_div));

    var bear = bearing(location_array[i].lat, location_array[i].lng, location_array[i+1].lat, location_array[i+1].lng);
    bearing_array.push(bear);
  }

    // res.json(shot_array.concat(bearing_array));
    // request("https://maps.googleapis.com/maps/api/streetview?size=600x300&location=40.724425345,-73.994257955&heading=17.70513968350292&pitch=-0.76", function(error, response, body){
    //   res.sendFile(body);
    //   });
    console.log("Lat:" + String(location_array[location_array.length-1].lat));
    var streetURL = "https://maps.googleapis.com/maps/api/streetview?size=600x300&location=" + String(location_array[location_array.length-1].lat) + "," + String(location_array[location_array.length-1].lng) + "&heading=" + bearing_array[bearing_array.length-1] + "&pitch=-0.76";
    console.log(streetURL);
    var requestSettings = {
         // url: "https://maps.googleapis.com/maps/api/streetview?size=600x300&location=40.724425345,-73.994257955&heading=17.70513968350292&pitch=-0.76",
         url : streetURL,
         method: 'GET',
         encoding: null
     };

    request(requestSettings, function(error, response, body) {
        res.set('Content-Type', 'image/png');
        // res.send({image: body, routeinformation: shot_array.concat(bearing_array) });
        res.send(body)
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








//Walking

// {
//    "geocoded_waypoints" : [
//       {
//          "geocoder_status" : "OK",
//          "place_id" : "ChIJM-b4VI9ZwokRaG2F8Yz8wJU",
//          "types" : [ "premise" ]
//       },
//       {
//          "geocoder_status" : "OK",
//          "place_id" : "ChIJz7j1FJ1ZwokRSbiqT8yvlJU",
//          "types" : [ "premise" ]
//       }
//    ],
//    "routes" : [
//       {
//          "bounds" : {
//             "northeast" : {
//                "lat" : 40.7285838,
//                "lng" : -73.98457019999999
//             },
//             "southwest" : {
//                "lat" : 40.7223839,
//                "lng" : -73.9951179
//             }
//          },
//          "copyrights" : "Map data ©2018 Google",
//          "legs" : [
//             {
//                "distance" : {
//                   "text" : "0.9 mi",
//                   "value" : 1457
//                },
//                "duration" : {
//                   "text" : "19 mins",
//                   "value" : 1114
//                },
//                "end_address" : "102 St Marks Pl, New York, NY 10009, USA",
//                "end_location" : {
//                   "lat" : 40.727249,
//                   "lng" : -73.98457019999999
//                },
//                "start_address" : "228 Mott St, New York, NY 10012, USA",
//                "start_location" : {
//                   "lat" : 40.7223839,
//                   "lng" : -73.9951179
//                },
//                "steps" : [
//                   {
//                      "distance" : {
//                         "text" : "0.2 mi",
//                         "value" : 277
//                      },
//                      "duration" : {
//                         "text" : "4 mins",
//                         "value" : 214
//                      },
//                      "end_location" : {
//                         "lat" : 40.7247856,
//                         "lng" : -73.99410619999999
//                      },
//                      "html_instructions" : "Head \u003cb\u003enorth\u003c/b\u003e on \u003cb\u003eMott St\u003c/b\u003e toward \u003cb\u003ePrince St\u003c/b\u003e",
//                      "polyline" : {
//                         "points" : "{qpwFndsbMwBo@OEMAcHaCMEKCME"
//                      },
//                      "start_location" : {
//                         "lat" : 40.7223839,
//                         "lng" : -73.9951179
//                      },
//                      "travel_mode" : "WALKING"
//                   },
//                   {
//                      "distance" : {
//                         "text" : "0.2 mi",
//                         "value" : 267
//                      },
//                      "duration" : {
//                         "text" : "4 mins",
//                         "value" : 223
//                      },
//                      "end_location" : {
//                         "lat" : 40.7238707,
//                         "lng" : -73.9912717
//                      },
//                      "html_instructions" : "Turn \u003cb\u003eright\u003c/b\u003e onto \u003cb\u003eE Houston St\u003c/b\u003e",
//                      "maneuver" : "turn-right",
//                      "polyline" : {
//                         "points" : "}`qwFd~rbMBIh@uBDQBIh@sBBMBQBGBQFYDSBODQXsARiA"
//                      },
//                      "start_location" : {
//                         "lat" : 40.7247856,
//                         "lng" : -73.99410619999999
//                      },
//                      "travel_mode" : "WALKING"
//                   },
//                   {
//                      "distance" : {
//                         "text" : "0.4 mi",
//                         "value" : 612
//                      },
//                      "duration" : {
//                         "text" : "7 mins",
//                         "value" : 447
//                      },
//                      "end_location" : {
//                         "lat" : 40.7285487,
//                         "lng" : -73.9876531
//                      },
//                      "html_instructions" : "Turn \u003cb\u003eleft\u003c/b\u003e onto \u003cb\u003e2nd Ave\u003c/b\u003e",
//                      "maneuver" : "turn-left",
//                      "polyline" : {
//                         "points" : "e{pwFllrbMa@[GGGGCEAC[UKGo@c@_Ao@MIm@_@gAs@MIkBoAMIq@c@y@m@KImBqAKGq@e@o@a@KGqBqADQ"
//                      },
//                      "start_location" : {
//                         "lat" : 40.7238707,
//                         "lng" : -73.9912717
//                      },
//                      "travel_mode" : "WALKING"
//                   },
//                   {
//                      "distance" : {
//                         "text" : "0.2 mi",
//                         "value" : 301
//                      },
//                      "duration" : {
//                         "text" : "4 mins",
//                         "value" : 230
//                      },
//                      "end_location" : {
//                         "lat" : 40.727249,
//                         "lng" : -73.98457019999999
//                      },
//                      "html_instructions" : "Turn \u003cb\u003eright\u003c/b\u003e onto \u003cb\u003eSt Marks Pl\u003c/b\u003e\u003cdiv style=\"font-size:0.9em\"\u003eDestination will be on the right\u003c/div\u003e",
//                      "maneuver" : "turn-right",
//                      "polyline" : {
//                         "points" : "mxqwFxuqbM`EiMDOz@mC"
//                      },
//                      "start_location" : {
//                         "lat" : 40.7285487,
//                         "lng" : -73.9876531
//                      },
//                      "travel_mode" : "WALKING"
//                   }
//                ],
//                "traffic_speed_entry" : [],
//                "via_waypoint" : []
//             }
//          ],
//          "overview_polyline" : {
//             "points" : "{qpwFndsbMgCu@qHcCYIMEBIn@gCl@}BNy@VoAl@}Ci@c@KM]YiCeBoFmDeCeB{EaD}ByAfE{M`A}C"
//          },
//          "summary" : "2nd Ave",
//          "warnings" : [
//             "Walking directions are in beta.    Use caution – This route may be missing sidewalks or pedestrian paths."
//          ],
//          "waypoint_order" : []
//       }
//    ],
//    "status" : "OK"
// }
