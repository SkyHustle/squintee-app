const electron      = require('electron');
const {ipcRenderer} = electron;
const appVersion    = require('./package.json').version;

$("#email-us-link")[0].href = $("#email-us-link")[0].href + " " + appVersion
$("title")[0].text = "Squintee " + appVersion

ipcRenderer.on('update-message', function(event, method) {
  alert(method);
});

// Notification
const path = require('path');
const notificationOptions = [
  {
    title: "Stop Squinting! (Basic)",
    body: "Damn brah sup with those brows coming so close together?"
  },
  {
    title: "Stop Squinting!",
    body: "Why are those brows oh so close together?",
    icon: path.join(__dirname, 'images/squinting-emoji.jpg'),
    silent: true
  }
]

console.log("appVersion: ", appVersion)

// SDK Needs to create video and canvas nodes in the DOM in order to function
// Here we are adding those nodes a predefined div.
const divRoot = $("#affdex_elements")[0];
const width = 640;
const height = 480;
const faceMode = affdex.FaceDetectorMode.LARGE_FACES;
//Construct a CameraDetector and specify the image width / height and face detector mode.
const detector = new affdex.CameraDetector(divRoot, width, height, faceMode);

//Enable detection of all Expressions, Emotions and Emojis classifiers.
detector.detectAllEmotions();
detector.detectAllExpressions();
detector.detectAllEmojis();
detector.detectAllAppearance();

//Add a callback to notify when the detector is initialized and ready for runing.
detector.addEventListener("onInitializeSuccess", () => {
  log('#logs', "The detector reports initialized");
  //Display canvas instead of video feed because we want to draw the feature points on it
  $("#face_video_canvas").css("display", "block");
  $("#face_video").css("display", "none");
});

const log = (node_name, msg) => {
  $(node_name).append("<span>" + msg + "</span><br />")
}

//function executes when Start button is pushed.
const onStart = () => {
  faceSearching()
  if (detector && !detector.isRunning) {
    $("#logs").html("");
    detector.start();
  }
  log('#logs', "Clicked the start button");
}

//function executes when the Stop button is pushed.
const onStop = () => {
  faceNotFound()
  log('#logs', "Clicked the stop button");
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();
  }
};

//function executes when the Reset button is pushed.
const onReset = () => {
  log('#logs', "Clicked the reset button");
  if (detector && detector.isRunning) {
    detector.reset();

    $('#results').html("");
  }
};

//Add a callback to notify when camera access is allowed
detector.addEventListener("onWebcamConnectSuccess", () => {
  log('#logs', "Webcam access allowed");
});

//Add a callback to notify when camera access is denied
detector.addEventListener("onWebcamConnectFailure", () => {
  log('#logs', "webcam denied");
  console.log("Webcam access denied");
});

//Add a callback to notify when detector is stopped
detector.addEventListener("onStopSuccess", () => {
  log('#logs', "The detector reports stopped");
  $("#results").html("");
});

const triggerSquintNotification = (browFurrowScore) => {
  let sensitivityNumber = Number($("#slider").val())
  if(browFurrowScore >= (120 - sensitivityNumber)) {
    let squintNotification  = new Notification(notificationOptions[1].title, notificationOptions[1]);
  }
}

const faceSearching = () => {
  $("#face-found-badge").text("Searching")
  $("#face-found-badge").css({background: "orange"})
}

const faceFound = () => {
  $("#face-found-badge").text("YES")
  $("#face-found-badge").css({background: "green"})
}

const faceNotFound = () => {
  $("#face-found-badge").text("NO")
  $("#face-found-badge").css({background: "#c9302c"})
}

//Add a callback to receive the results from processing an image.
//The faces object contains the list of the faces detected in an image.
//Faces object contains probabilities for all the different expressions, emotions and appearance metrics
detector.addEventListener("onImageResultsSuccess", (faces, image, timestamp) => {
  $('#results').html("");
  log('#results', "Timestamp: " + timestamp.toFixed(2));
  log('#results', "Number of faces found: " + faces.length);
  if (faces.length > 0) {
    log('#results', "Appearance: " + JSON.stringify(faces[0].appearance));
    log('#results', "Emotions: " + JSON.stringify(faces[0].emotions, (key, val) => {
      return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log('#results', "Expressions: " + JSON.stringify(faces[0].expressions, (key, val) => {
      return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log('#results', "Emoji: " + faces[0].emojis.dominantEmoji);
    drawFeaturePoints(image, faces[0].featurePoints);
    faceFound()
  } else {
    faceNotFound()
  }

  triggerSquintNotification(faces[0].expressions.browFurrow)
});

//Draw the detected facial feature points on the image
const drawFeaturePoints = (img, featurePoints) => {
  const contxt = $('#face_video_canvas')[0].getContext('2d');

  const hRatio = contxt.canvas.width / img.width;
  const vRatio = contxt.canvas.height / img.height;
  const ratio = Math.min(hRatio, vRatio);

  contxt.strokeStyle = "#FFFFFF";
  for (const id in featurePoints) {
    contxt.beginPath();
    contxt.arc(featurePoints[id].x,
      featurePoints[id].y, 2, 0, 2 * Math.PI);
    contxt.stroke();

  }
}

$("#canvas-and-results").hide()
