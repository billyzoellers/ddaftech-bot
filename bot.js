//  __   __  ___        ___
// |__) /  \  |  |__/ |  |
// |__) \__/  |  |  \ |  |

// This is the main file for the ddaftech-bot bot.

// Import Botkit features
const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');
const { MongoDbStorage } = require('botbuilder-storage-mongodb');

// Other required features
const ConnectWiseRest = require('connectwise-rest');
const mongoose = require('mongoose');

// Load process.env values from .env file
require('dotenv').config();

let storage = null;
if (process.env.MONGO_URL) {
  storage = new MongoDbStorage({
    url: process.env.MONGO_URL,
  });
}

const adapter = new WebexAdapter({
  secret: process.env.SECRET,
  access_token: process.env.access_token,
  public_address: process.env.public_address,
});

/*
 * Database for storing custom information
 */
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useFindAndModify: false });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
// schema for notification
  const notificationSchema = new mongoose.Schema({
    company_id: String,
    board_id: String,
    status_id: String,
    room_id: String,
    created_by_user_id: String,
  });

  const Notification = mongoose.model('Notification', notificationSchema); // eslint-disable-line no-unused-vars
});

const controller = new Botkit({
  webhook_uri: '/api/messages',
  adapter,
  storage,
});

// Once the bot has booted up its internal services, you can use them to do stuff.
controller.ready(() => {
  // load traditional developer-created local custom feature modules
  controller.loadModules(`${__dirname}/features`);
});

controller.webserver.get('/', (req, res) => {
  res.send(`This app is running Botkit ${controller.version}.`);
});

/*
 * Temporary additional webhook for Adaptive Card responses
 */
controller.ready(async () => {
  await controller.adapter.registerAdaptiveCardWebhookSubscription('/api/messages');
});

/*
 * Recieve ConnectWise webhooks
 */
controller.webserver.post('/cw', async (req, res) => {
  res.status(200);
  res.send('ok');

  // get the callback data, and X-Content-Signature from headers
  const callback = req.body;
  const callbackXContentSignature = req.headers['x-content-signature'];

  // establish API connection to verify callback
  const cw = new ConnectWiseRest({
    companyId: process.env.CW_COMPANY,
    companyUrl: 'connectwise.deandorton.com',
    clientId: process.env.CW_CLIENTID,
    publicKey: process.env.CW_PUBLIC_KEY,
    privateKey: process.env.CW_PRIVATE_KEY,
    debug: false, // optional, enable debug logging
  });

  // if signature matches in callback
  if (await cw.utils.Callback.verifyCallback(callback, callbackXContentSignature) === false) {
    console.error('POST /cw webhook ERROR unable to verify. Request below');
    console.log(req);

    return;
  }

  if (callback.FromUrl !== 'connectwise.deandorton.com') {
    console.error('POST /cw webhook ERROR verified but sourced from wrong domain. Request below');
    console.log(req);

    return;
  }

  const ticketId = callback.ID;
  const action = callback.Action;
  console.log(`POST /cw webhook verified for ticketId ${ticketId} with action ${action}`);

  // do not send trigger on specific actions
  if (action === 'deleted' || action === 'updated') {
    console.log(`POST /cw webhook not firing message for action ${action}`);
    return;
  }

  if (process.env.PROCESS_WEBHOOK === 'no') {
    console.log('POST /cw webhook did not trigger bot due to PROCESS_WEBHOOK=no');
    return;
  }

  const bot = await controller.spawn(adapter);
  controller.trigger('ticket_webhook', bot, { ticketId, action });
});
