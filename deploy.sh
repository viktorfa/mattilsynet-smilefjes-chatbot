#!/usr/bin/env bash

git add -A
git commit -am 'Deploying to Heroku'
git push -f heroku master