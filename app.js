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
    if (isTextMessage(event)) {
        handleTextMessage(event);
    } else if (isPostbackMessage(event)) {
        handlePostbackMessage(event);
    }
};

const handleTextMessage = (event) => {
    typingOn(event.sender.id);
    sendMessage(getTextMessage('Spraydiaré'), event.sender.id);
    sendMessage(getTemplateMessage(getButtonPayload('Promp eller analkuler?',
        [getWebUrlButton('Analkuler', 'https://google.com'), getPostbackButton('Promp', 'PROMP')])), event.sender.id);
};

const handlePostbackMessage = (event) => {
    switch (event.postback.payload) {
        case 'PROMP':
            sendMessage(getTextMessage('Promp fra postback'), event.sender.id);
            break;
        default:
            console.log("What the fuck are ya doin?");
    }
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
    return {
        type: 'postback',
        title: title,
        payload: payload
    };
};

const getWebUrlButton = (title, url) => {
    return {
        type: 'web_url',
        title: title,
        url: url
    };
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

const isPostbackMessage = (event) => {
    return event.postback && event.postback.payload;
};

http.createServer(app).listen(PORT);
console.log(`Listening to ${PORT}`);