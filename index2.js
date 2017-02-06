var mqtt = require('./mqtt');

function sendToMqtt(topic, payload) {
    var sessionAttributes = null;

    mqtt.send(topic, payload).then(function() {
        console.log('Success: ' + topic + ' ' + (payload || ''));
    }, function(e) {
        console.log('Error: ' + JSON.stringify(e));
    });
}

sendToMqtt('events/home/speak', '1');
