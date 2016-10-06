'use strict';

const _ = require('lodash');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

let app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', (req, res) => {
    res.sendStatus(200);
});

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong FACEBOOK_SITE_TOKEN')
});

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i];
        handleMessage(event);
    }
    res.sendStatus(200)
});

const handleMessage = (event) => {
    let sender = event.sender.id;
    if (isTextMessage(event)) {
        handleTextMessage(event);
    }
};

const handleTextMessage = (event) => {
    typingOn(event.sender.id);
    sendMessage(getTextMessage('Spraydiaré'), event.sender.id);
    sendMessage(getTemplateMessage(getButtonPayload('Promp', [getButton('url', 'Analkuler', 'https://google.com')])))
};

const getTextMessage = (text) => {
    return {text: text};
};

const sendMessageBlock = () => {

};

const typingOn = (senderId) => {
    sendAction('typing_on', senderId)
};

const getPostbackButton = (title, payload) => {
    return getButton('postback', title, payload);
};

const getButton = (type, title, payload) => {
    return {
        type: type,
        title: title,
        payload: payload
    }
};

const getButtonPayload = (text, buttons) => {
    return {
        template_type: 'button',
        text: text,
        buttons: buttons
    }
};

const getTemplateMessage = (payload) => {
    return {
        attachment: {
            type: 'template',
            payload: payload
        }
    }
};

const sendMessage = (messageObject, senderId) => {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: senderId},
            message: messageObject,
        }
    }, (error, response, body) => {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    });
};

const sendAction = (actionString, senderId) => {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: senderId},
            sender_action: actionString,
        }
    }, (error, response, body) => {
        if (error) {
            console.log('Error sending action: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    });
};

const isTextMessage = (event) => {
    return event.message && event.message.text;
};

http.createServer(app).listen(PORT);
console.log(`Listening to ${PORT}`);
