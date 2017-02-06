var mqtt = require('./mqtt');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function(event, context) {
    try {
        console.log("event.session.application.applicationId=" +
            event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        if (event.session.application.applicationId !==
            "amzn1.echo-sdk-ams.app.252e0b0e-894c-4780-a069-b03fb09790fd"
        ) {
            context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId },
                event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes,
                    speechletResponse) {
                    context.succeed(buildResponse(
                        sessionAttributes,
                        speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes,
                    speechletResponse) {
                    context.succeed(buildResponse(
                        sessionAttributes,
                        speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest
        .requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("TaskerAutomate" === intentName) {
        automateTask(intent, session, callback);
    } else if ("TaskerVolume" === intentName) {
        automateVolume(intent, session, callback);
    } else if ("TaskerAlarmSet" === intentName) {
        automateAlarmSet(intent, session, callback);
    } else if ("TaskerNavigate" === intentName) {
        automateNavigation(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName ||
        "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "What's up?";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Come on, what's up?";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput,
            repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Have a nice day!";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null,
        shouldEndSession));
}

function sendToMqtt(topic, payload, successResponseText, intent,
    repromptText, shouldEndSession, callback) {
    var sessionAttributes = null;

    mqtt.send(topic, payload).then(function() {
        console.log('Success: ' + topic + ' ' + (payload || ''));
        callback(sessionAttributes,
            buildSpeechletResponse(intent.name,
                successResponseText, repromptText,
                shouldEndSession));

    }, function(e) {
        console.log('Error: ' + JSON.stringify(e) + ' when sending ' + topic + ' ' + (payload || ''));
        callback(sessionAttributes,
            buildSpeechletResponse(intent.name,
                'There was an error while sending the M cute event.',
                repromptText, shouldEndSession));

    });
}


function automateTask(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    if (!(intent.slots && intent.slots.Task && intent.slots.Task.value)) {
        speechOutput = 'I didn\'t understand the task.';
        callback(sessionAttributes,
            buildSpeechletResponse(intent.name, speechOutput,
                repromptText, shouldEndSession));
        return;
    }

    sendToMqtt(
        'events/task',
        intent.slots.Task.value,
        'I heard "' + intent.slots.Task.value + '". ',
        intent,
        repromptText,
        shouldEndSession,
        callback
    );
}

function automateVolume(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    var slotValue = intent.slots && intent.slots.Volume && intent.slots
        .Volume.value;
    slotValue = parseInt(slotValue, 10);

    if (isNaN(slotValue)) {
        speechOutput = 'I couldn\'t set the volume.';
        callback(sessionAttributes,
            buildSpeechletResponse(intent.name, speechOutput,
                repromptText, shouldEndSession));
        return;
    }

    sendToMqtt(
        'events/kodi/volume',
        JSON.stringify(slotValue),
        '"' + slotValue + '" it is.',
        intent,
        repromptText,
        shouldEndSession,
        callback
    );
}

function automateAlarmSet(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    var slotValue = intent.slots && intent.slots.AlarmTime && intent.slots.AlarmTime.value;

    if (!slotValue) {
        speechOutput = 'I couldn\'t set your alarm, please try again.';
        shouldEndSession = false;
        callback(sessionAttributes,
            buildSpeechletResponse(intent.name, speechOutput,
                repromptText, shouldEndSession));
        return;
    }

    sendToMqtt(
        'events/alarm/set',
        JSON.stringify(slotValue),
        'Setting alarm at "' + slotValue + '".',
        intent,
        repromptText,
        shouldEndSession,
        callback
    );
}

function automateNavigation(intent, session, callback) {
    var repromptText = 'What next?';
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = '';

    var slotValue = intent.slots && intent.slots.NavAction && intent.slots
        .NavAction.value;

    if (!slotValue) {
        speechOutput = 'I couldn\'t navigate.';
        callback(sessionAttributes,
            buildSpeechletResponse(intent.name, speechOutput,
                repromptText, shouldEndSession));
        return;
    }

    if (['nothing', 'none', 'i\'m done', 'that\'s it'].indexOf(
            slotValue.toLowerCase()) > -1) {
        shouldEndSession = true;
        repromptText = null;
        possibleAnswers = ['K thanks bye!', 'Peace out.', 'See ya.',
            'Bye bye!', 'I\'m outta here.', 'As you wish!',
            'Certainly!', 'Well of course!', 'Whatever.',
            'Nevermind.', 'Ugh.', 'Barf.'
        ];
        speechOutput = possibleAnswers[Math.floor(Math.random() *
            possibleAnswers.length)];
        callback(sessionAttributes,
            buildSpeechletResponse(intent.name, speechOutput,
                repromptText, shouldEndSession));
        return;
    }

    if (slotValue.toLowerCase().indexOf(' and exit') > -1) {
        shouldEndSession = true;
        slotValue = slotValue.toLowerCase().split(' and exit')[0];
    }

    sendToMqtt(
        'events/kodi/execute',
        slotValue,
        '"' + slotValue + '". ',
        intent,
        repromptText,
        shouldEndSession,
        callback
    );
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText,
    shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        // card: {
        //     type: "Simple",
        //     title: "Tasker - " + title,
        //     content: "Tasker - " + output
        // },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
