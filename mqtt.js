var mqtt = require('mqtt');
var fs = require('fs');
var env = require('./env');
var Promise = require('promise');

var clientOptions = {
    protocol: 'mqtts',
    host: env.mqtt.host,
    port: env.mqtt.port,
    username: env.mqtt.username,
    password: env.mqtt.password,
    ca: [fs.readFileSync('./certificates/ca.crt')],
    rejectUnauthorized: true
};

var publishOptions = {
    qos: 2
};

function log() {
    if (false) {
        console.log.apply(console, arguments);
    }
}

module.exports.send = function(topic, payload) {
    return new Promise(function(resolve, reject) {
        if (!topic) {
            reject('No topic specified.');
            return;
        }
        if (typeof payload !== 'string' && typeof payload !== 'undefined') {
            reject('Payload must be a string or undefined.');
            return;
        }
        log('Attempting connection...');
        var client = mqtt.connect(clientOptions);

        client.on('connect', function() {
            log('Connected.');
            log('Attempting publish...');
            client.publish(topic, payload, publishOptions, function(e) {
                if (e) {
                    log('Publishing error.', e);
                    reject(e);
                }
                log('Published.');
                client.end();
                resolve();
            });
        });

        client.on('error', function(e) {
            log('Connection error.', e);
            client.end();
            reject(e);
        });
    });
};
