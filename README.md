# alexa-iot

**This project is an Alexa skills kit that turns custom voice commands into entry points to an MQTT-based home automation system.**

This device adapter takes care of device discovery and exposes home automation functionality as virtual devices.

Incoming intents from Alexa are interpreted based on the their intent parameters and then turned into MQTT messages sent to an MQTT broker.

This skill is deployed on AWS Lambda.

It could easily be modified to do anything else instead of sending MQTT messages. If e.g. your home automation system is based on Pushbullet, Tasker AutoRemote or some kind of HTTP based protocol, it should take only a few minutes to fit your own needs.

## Requirements

If you run your own MQTT broker with a self-signed certificate, make sure it's available in `/certificates/ca.crt`, so it can be read my `/mqtt.js`.

You will also need to create a file `/env.js` that holds your MQTT server configuration.

```JS
// env.js

module.exports = {
    mqtt: {
        username: 'matt',
        password: 'mySecretPassword',
        host: 'test.mosquitto.org',
        port: '8883',
    }
};
```

## Deployment

Run `npm install` to install all dependencies locally. Modify `Makefile` to point to the correct Lambda function in your AWS account. You can then run `make deploy` to automatically upload your code to AWS and use Alexa to test your changes.

### Local testing
For local development, you can run `node index2.js` to see if your host configuration works.

## Interaction model

The interaction model (`/interaction-model`) is not part of the Lambda function but instead saved as part of the skill configuration at [https://developer.amazon.com/](https://developer.amazon.com/). Intent names and tasks have in the interaction model and in `index.js` have to match.

Learn more about [how to write your own custom Alexa skill](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/getting-started-guide) in this guide.
