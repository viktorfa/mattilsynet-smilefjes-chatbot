'use strict';

const _ = require('lodash');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

let app = express();
const PORT = process.env.PORT || 3000;

const DIFIURL = 'http://hotell.difi.no/api/json/mattilsynet/smilefjes/tilsyn?query=';

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

const handleShowAllPostback = (payloadObject, senderId) => {
    getDifiResponse(payloadObject.query)
        .then(
            data => handleDifiResponse(data, payloadObject.query, senderId, true),
            error => console.log(error)
        );
};

const handleTextMessage = (event) => {
    let text = event.message.text;
    let senderId = event.sender.id;
    sendMessage(getTextMessage(`Søker etter "${text}"`), senderId);
    typingOn(event.sender.id);
    getDifiResponse(text)
        .then(data => handleDifiResponse(data, text, senderId), error => console.log(error));
};


const orderByDate = (a, b) => {
    if (Number.parseInt(a.dato.substring(4, 8)) < Number.parseInt(b.dato.substring(4, 8))) {
        return -1;
    } else if (Number.parseInt(a.dato.substring(2, 4)) < Number.parseInt(b.dato.substring(2, 4))) {
        return -1;
    } else {
        return Number.parseInt(a.dato.substring(0, 2)) - Number.parseInt(b.dato.substring(0, 2))
    }
};


const handleDifiResponse = (difiResponse, query, senderId, showAll) => {
    const groupedEntries = _.groupBy(difiResponse.entries, 'orgnummer');
    sendMessage('grouped entries');
    sendMessage(groupedEntries);
    const length = Object.keys(groupedEntries).length;
    sendMessage(length);
    if (length === 0) {
        sendMessage(getTextMessage(`Fant ingen treff på "${query}"`), senderId);
    } else if (showAll === true) {
        _.each(groupedEntries, entry => sendMessage(getMessageFromEntryList(entry), senderId));
    } else if (length <= 5) {
        _.each(groupedEntries, entry => sendMessage(getMessageFromEntryList(entry), senderId));
    } else {
        let count = 0;
        _.some(groupedEntries, entry => sendMessage(getMessageFromEntryList(entry), senderId));
        sendMessage(getTemplateMessage(getButtonPayload(`Fant ${length - 5} flere treff.`,
            [getPostbackButton("Vis alle", getShowAllResultsPostbackPayload(query))])), senderId);
        count++;
        return count >= 5;
    }
};

const getShowAllResultsPostbackPayload = (query) => {
    return JSON.stringify({type: 'SHOW_ALL', query: query});
};

const getMessageFromEntryList = (entryList) => {
    entryList = entryList.sort(orderByDate);
    const latestEntry = _.nth(entryList, -1);
    const nextEntry = _.nth(entryList, -2);
    let result = `${latestEntry.navn} (${_.capitalize(latestEntry.poststed)}) har fått vurdering ${getAssessmentString(latestEntry.total_karakter)} (${getFormattedDate(latestEntry.dato)})`;
    if (!_.isUndefined(nextEntry)) {
        result += ` og ${getAssessmentString(nextEntry.total_karakter)} (${getFormattedDate(nextEntry.dato)})`;
    }
    return getTextMessage(result);
};
const getFormattedDate = (dateString) => {
    return `${dateString.substring(0, 2)}.${dateString.substring(2, 4)}.${dateString.substring(4, 8)}`
};

const getAssessmentString = (grade) => {
    switch (grade) {
        case '0':
            return 'bra :)';
            break;
        case '1':
            return 'bra :)';
            break;
        case '2':
            return 'middels :|';
            break;
        case '3':
            return 'dårlig :(';
            break;
        default:
            return 'ukjent';
    }
};

const handlePostbackMessage = (event) => {
    let payloadObject = JSON.parse(event.postback.payload);
    switch (payloadObject.type) {
        case 'PROMP':
            sendMessage(getTextMessage('Promp fra postback'), event.sender.id);
            break;
        case 'SHOW_ALL':
            handleShowAllPostback(payloadObject, event.sender.id);
            break;
        default:
            console.log("What the fuck are ya doin?");
    }
};

const getDifiResponse = (query) => {
    return new Promise((resolve, reject) => {
        request({
            url: getDifiUrl(query),
            method: 'GET',
        }, (error, response, body) => {
            if (error) {
                console.log('Error sending messages: ', error);
                reject(error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
                reject(response.body.error);
            } else {
                resolve(JSON.parse(response.body));
            }
        })
    })
};

const getDifiUrl = (query) => {
    return `${DIFIURL}${query.replace(' ', '%20')}`;
};

const getTextMessage = (text) => {
    return {text: text};
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
