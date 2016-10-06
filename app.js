'use strict';

const _ = require('lodash');
const http = require('http');
const express = require('express');
const Bot = require('messenger-bot');
const bodyParser = require('body-parser');

let bot = new Bot({
    token: process.env.PAGE_TOKEN,
    verify: process.env.VERIFY_TOKEN,
    app_secret: process.env.APP_SECRET
});

bot.on('error', (err) => {
    console.log(err.message)
});

bot.on('message', (payload, reply) => {
    let text = payload.message.text;

    bot.getProfile(payload.sender.id, (err, profile) => {
        if (err) throw err;

        reply({text}, (err) => {
                //if (err) throw err;

                console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
            }
        )
    })
});


let app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', (req, res) => {
    res.sendStatus(200);
});

app.get('/webhook/', (req, res) => {
    return bot._verify(req, res)
});

app.post('/webhook/', (req, res) => {
    bot._handleMessage(req.body);
    res.end(JSON.stringify({status: 'ok'}))
});


http.createServer(app).listen(PORT);
console.log(`Listening to ${PORT}`);
