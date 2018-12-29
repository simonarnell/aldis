const MorseCW = require('morse-pro/lib/morse-pro-cw').default
const Twitter = require('twitter');
const wpi = require('wiringpi-node');
const config = require('./config.json')

const led_pin = config.gpio.led_pin

wpi.setup('gpio');
wpi.pinMode(led_pin, wpi.OUTPUT);
wpi.digitalWrite(led_pin, wpi.LOW);

var messages = []
var _isPlaying = false;

setInterval(() => {
  if (messages.length > 0 && !isPlaying()) {
    let message = messages.shift()
    message = message.replace(/[^a-zA-Z0-9]/g, "");
    console.log(message)
    playMessage(message)
  }
}, 10)

var twitterClient = new Twitter({
  consumer_key: config.twitter.credentials.TWITTER_CONSUMER_KEY,
  consumer_secret: config.twitter.credentials.TWITTER_CONSUMER_SECRET,
  access_token_key: config.twitter.credentials.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: config.twitter.credentials.TWITTER_ACCESS_TOKEN_SECRET
});


var filter = {};

if (config.twitter.queries.follow.length > 0) {
  filter.follow = config.twitter.queries.follow.join()
}

if (config.twitter.queries.track.length > 0) {
  filter.track = config.twitter.queries.track.join()
}

twitterClient.stream('statuses/filter', filter, function(stream) {
  console.log("connected to twitter streaming API")
  stream.on('data', (event) => {
    console.log('Tweet Detected')
    console.log(event.text)
    messages.push(event.text)
  });

  stream.on('error', (error) => {
    throw error;
  });
});

var morseCW = new MorseCW(false, config.wordsPerMinute)

function playMessage(message) {
  _isPlaying = true;
  console.log("message " + message)
  var encodedMessage = morseCW.translate(message);
  console.log("encoded message " + encodedMessage)
  var timings = morseCW.getTimings();
  console.log("timings " + timings)

  let cumulativeTime = 0;

  timings.forEach(async (timing, i, arr) => {
    const duration = Math.abs(timing)
    const t0 = cumulativeTime;
    const t1 = t0 + duration;
    cumulativeTime += duration;
    let state = false
    if (timing > 0) {
      state = true
    }
    setTimeout(() => {
      console.log("timing value - " + timing + " t0 - " + t0 + " state - " + state)
      if (state) {
        wpi.digitalWrite(led_pin, wpi.HIGH);
        console.log("ON")
      } else {
        wpi.digitalWrite(led_pin, wpi.LOW);
        console.log("OFF")
      }
    }, t0)
    setTimeout(() => {
      console.log("timing value - " + timing + " t1 - " + t1)
      wpi.digitalWrite(led_pin, wpi.LOW);
      console.log("OFF")
      if (Object.is(i, arr.length - 1))
        _isPlaying = false;
    }, t1)
  })
}

function isPlaying() {
  return _isPlaying
}