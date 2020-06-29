/**
 * attachmentActions.js
 * handles all attachmentActions - when an adaptive card has inputs
 */
const ConnectWiseRest = require('connectwise-rest');
const ACData = require('adaptivecards-templating');
const mongoose = require('mongoose');
const meraki = require('meraki');

const utility = require('../tools/utility');

module.exports = (controller) => {
  controller.on('attachmentActions', async (bot, message) => {
    console.log('attachmentActions.js: recieved an attachment action');
    console.log(message.inputs);

    switch (message.inputs.id) {
      case 'cw_ticket_assign_self':
        console.log('attachmentActions.js: for cw assign to self');
        await processCWTicketAssignSelf(message.inputs.ticketId, message.personId, bot, message);

        break;
      case 'submit_mv_list_info':
        console.log('attachmentActions.js: for mv list info');
        await processMVInfo(message.inputs.mv_list_serial, bot, message);

        break;
      case 'submit_mv_list_snapshot':
        console.log('attachmentActions.js: for mv list snapshot');
        await processMVSnapshot(message.inputs.mv_list_serial, bot, message);

        break;
      case 'add_cw_notification':
        console.log('attachmentActions.js: for add cw notification');
        await processAddCWNotifications(message.inputs.company_name, bot, message);

        break;
      case 'delete_cw_notification':
        console.log('attachmentActions.js: for delete cw notification');
        await processDeleteCWNotifications(message.inputs.cw_notifications_edit, bot, message);

        break;
      case 'confirm_cw_notification':
        console.log('attachmentActions.js: for confirm cw notification');
        await processConfirmCWNotifications(message.inputs.cw_confirm_company_id, bot, message);

        break;
      case 'submit_cw_add_comment':
        await processAddCWComment(bot, message);

        break;
      default:
        console.log('attachmentActions.js: got attachment action for unknown action');
        break;
    }
  });
};

async function processAddCWComment(bot, message) {
  // Connect to CW API
  const cw = new ConnectWiseRest({
    companyId: process.env.CW_COMPANY,
    companyUrl: 'connectwise.deandorton.com',
    clientId: process.env.CW_CLIENTID,
    publicKey: process.env.CW_PUBLIC_KEY,
    privateKey: process.env.CW_PRIVATE_KEY,
    debug: false, // optional, enable debug logging
  });

  // Match webex member to connectwise
  const webexPerson = await bot.api.people.get(message.personId);
  const memberIdent = webexPerson.emails[0].split('@')[0];
  let cwPerson;
  try {
    cwPerson = await cw.SystemAPI.Members.getMemberByIdentifier(memberIdent);
  } catch (e) {
    console.log(`attachmentAction.js: error finding ConnectWise member from identifier ${memberIdent}`);
    console.error(e);

    const text = `Sorry, I wasn't able to find you in ConnectWise. <em>${e.message} (${e.code})</em>`;
    await bot.reply(message, { markdown: text });

    return;
  }

  // ticket status change
  let updatedTicket;
  if (message.inputs.cw_current_status_id !== message.inputs.cw_new_status_id) {
    // make API request to update ticket
    try {
      const ops = [{
        op: 'replace',
        path: 'status',
        value: {
          id: message.inputs.cw_new_status_id,
        },
      }];

      // eslint-disable-next-line max-len
      updatedTicket = await cw.ServiceDeskAPI.Tickets.updateTicket(Number(message.inputs.ticketId), ops);
    } catch (e) {
      console.log(`attachmentActions.js: error on updateTicket with ticketId ${message.inputs.ticketId}`);
      console.error(e);

      const text = `Sorry, I wasn't able to change the ticket status in ConnectWise. <em>${e.message} (${e.code})</em>`;
      await bot.reply(message, { markdown: text });

      return;
    }
  }

  // note added
  let newServiceNote;
  if (message.inputs.cw_add_comment) {
    // create a note to post to the ticket
    const note = {
      ticketId: message.inputs.ticketId,
      text: message.inputs.cw_add_comment,
      internalAnalysisFlag: (message.inputs.cw_comment_visibility === 'private'),
      detailDescriptionFlag: (message.inputs.cw_comment_visibility === 'public'),
      processNotifications: (message.inputs.cw_comment_visibility === 'public'),
      member: {
        id: cwPerson.id,
      },
    };

    // post the new note to the ticket
    try {
      // eslint-disable-next-line max-len
      newServiceNote = await cw.ServiceDeskAPI.ServiceNotes.createServiceNote(message.inputs.ticketId, note);

      console.log(newServiceNote);
    } catch (e) {
      console.log(`attachmentAction.js: error on createServiceNote with ticketId ${message.inputs.ticketId}`);
      console.error(e);

      const text = `Sorry, I wasn't able to add a new serviceNote in ConnectWise. <em>${e.message} (${e.code})</em>`;
      await bot.reply(message, { markdown: text });

      return;
    }
  }

  let responseText = `${webexPerson.firstName} ${webexPerson.lastName} updated ticket # ${message.inputs.ticketId}:`;

  if (newServiceNote) {
    responseText += '<blockquote>**';
    if (message.inputs.cw_comment_visibility === 'public') {
      responseText += 'public comment';
    } else {
      responseText += 'private note';
    }
    responseText += `**<br />${newServiceNote.text}</blockquote>`;
  } else {
    responseText += '<br />';
  }
  if (updatedTicket) {
    responseText += `*changed status to ${utility.formatStatus(updatedTicket.status.name)}*`;
  }

  try {
    /* TODO:
        message.id is the Id of the attachmentAction form response
        message.messageId is the Id of the form that triggered the attachmentAction
        message.parentId will never exist on an attachmentAction

        To respond appropriately:
          get the full body of the form that triggered the attachmentAction (realMessage) from API
          set message.id to the Id of realMessage
          set message.parentId to the parentId of realMessage
    */
    const realMessage = await bot.api.messages.get(message.messageId);
    message.id = realMessage.id; // eslint-disable-line no-param-reassign
    message.parentId = realMessage.parentId; // eslint-disable-line no-param-reassign

    await bot.replyInThread(message, { markdown: responseText });
  } catch (e) {
    console.error(e);
  }
}

// Take a ConnectWise ticket Id and Webex Teams person Id and assign the ticket
//      to that person in ConnectWise
async function processCWTicketAssignSelf(cwTicketId, wtPersonId, bot, message) {
  console.log(`attachmentActions.js: processCWTicketAssignSelf(): Processing for cwTicketId ${cwTicketId} and wtPersonId ${wtPersonId}`);

  // create API connection to CW
  const cw = new ConnectWiseRest({
    companyId: process.env.CW_COMPANY,
    companyUrl: 'connectwise.deandorton.com',
    clientId: process.env.CW_CLIENTID,
    publicKey: process.env.CW_PUBLIC_KEY,
    privateKey: process.env.CW_PRIVATE_KEY,
    debug: false, // optional, enable debug logging
  });

  // match person in Webex to person in CW via email == username
  const person = await bot.api.people.get(wtPersonId);
  const memberIdent = person.emails[0].split('@')[0];
  let cwPerson;
  try {
    cwPerson = await cw.SystemAPI.Members.getMemberByIdentifier(memberIdent);
    console.log(`attachmentActions.js: processCWTicketAssignSelf(): found cwPerson ${cwPerson} from memberIdent ${memberIdent}`);
  } catch (e) {
    console.log(`attachmentAction.js: error finding ConnectWise member from identifier ${memberIdent}`);
    console.error(e);

    const text = `Sorry, I wasn't able to find you in ConnectWise. <em>${e.message} (${e.code})</em>`;
    await bot.replyInThread(message, { markdown: text });

    return;
  }

  // Make API requests for ticket data
  let ticket;
  try {
    ticket = await cw.ServiceDeskAPI.Tickets.getTicketById(cwTicketId);
    console.log(`attachmentActions.js: processCWTicketAssignSelf(): got ticket with id ${ticket.id}`);
  } catch (e) {
    console.log(`cw-ticket.js: error on getTicketById with ticketId ${cwTicketId}`);
    console.error(e);

    throw (e);
  }

  if (ticket.owner) {
    const space = await bot.api.rooms.get(message.channel);

    let text = '';
    if (space.type === 'group') {
      text += `<@personId:${person.id}|${person.nickName}>, **t`;
    } else {
      text += '**T';
    }
    text += `icket #${cwTicketId}** is already assigned to **${ticket.owner.name}**.`;

    /* TODO:
        message.id is the Id of the attachmentAction form response
        message.messageId is the Id of the form that triggered the attachmentAction
        message.parentId will never exist on an attachmentAction

        To respond appropriately:
          get the full body of the form that triggered the attachmentAction (realMessage) from API
          set message.id to the Id of realMessage
          set message.parentId to the parentId of realMessage
    */
    const realMessage = await bot.api.messages.get(message.messageId);
    message.id = realMessage.id; // eslint-disable-line no-param-reassign
    message.parentId = realMessage.parentId; // eslint-disable-line no-param-reassign

    await bot.replyInThread(message, { markdown: text });
    console.log(`attachmentActions.js: processCWTicketAssignSelf() ${person.displayName} attempted to self assign #${cwTicketId} but was already assigned in CW.`);
  } else {
    // make API request to update ticket
    try {
      const ops = [{
        op: 'replace',
        path: 'owner',
        value: {
          id: cwPerson.id,
        },
      }];

      await cw.ServiceDeskAPI.Tickets.updateTicket(Number(message.inputs.ticketId), ops);
    } catch (e) {
      console.log(`attachmentActions.js: error on updateTicket with ticketId ${cwTicketId}`);
      console.error(e);

      const text = `Sorry, I wasn't able to assign this ticket in ConnectWise. <em>${e.message} (${e.code})</em>`;
      await bot.replyInThread(message, { markdown: text });

      return;
    }

    const text = `>**${person.displayName}** has picked up **ticket #${cwTicketId}**.`;
    /* TODO:
        message.id is the Id of the attachmentAction form response
        message.messageId is the Id of the form that triggered the attachmentAction
        message.parentId will never exist on an attachmentAction

        To respond appropriately:
          get the full body of the form that triggered the attachmentAction (realMessage) from API
          set message.id to the Id of realMessage
          set message.parentId to the parentId of realMessage
    */
    const realMessage = await bot.api.messages.get(message.messageId);
    message.id = realMessage.id; // eslint-disable-line no-param-reassign
    message.parentId = realMessage.parentId; // eslint-disable-line no-param-reassign

    await bot.replyInThread(message, { markdown: text });
    console.log(`attachmentActions.js: processCWTicketAssignSelf() ${person.displayName} self assigned #${cwTicketId}`);
  }

  console.log(`attachmentActions.js: processCWTicketAssignSelf(): Completed for cwTicketId ${cwTicketId}`);
}

// Find companys matching company_string and present them to the user for confirmation
//      that they want a notification to be added
async function processAddCWNotifications(companyString, bot, message) {
  // create API connection to CW
  const cw = new ConnectWiseRest({
    companyId: process.env.CW_COMPANY,
    companyUrl: 'connectwise.deandorton.com',
    clientId: process.env.CW_CLIENTID,
    publicKey: process.env.CW_PUBLIC_KEY,
    privateKey: process.env.CW_PRIVATE_KEY,
    debug: false, // optional, enable debug logging
  });

  const params = {
    conditions: `name='${companyString}'`,
  };

  let companies;
  try {
    companies = await cw.CompanyAPI.Companies.getCompanies(params);
  } catch (e) {
    console.log(`attachmentActions.js: processAddCWNotifications() ERROR getCompanies() ${companyString}`);
    console.error(e);

    throw (e);
  }

  if (companies.length === 0) {
    const text = `I was not able to find a company named <em>${companyString}</em> in ConnectWise.`;
    await bot.reply(message, { markdown: text });

    return;
  }

  await sendConfirmCWNotifications(companies, bot, message);
}

// Send a confirmation message to the user after they requested notifications to be added
async function sendConfirmCWNotifications(companies, bot, message) {
  const templatePayload = {
    type: 'AdaptiveCard',
    version: '1.1',
    body: [
      {
        type: 'TextBlock',
        size: 'Medium',
        weight: 'Bolder',
        text: 'Confirm New Notification',
      },
      {
        type: 'Input.ChoiceSet',
        choices: [
          {
            $data: '{companies}',
            title: "{name + ' (cwID: ' + toString(id) + ')'}",
            value: '{toString(id)}',
          },
        ],
        id: 'cw_confirm_company_id',
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Confirm',
        data: {
          id: 'confirm_cw_notification',
        },
      },
    ],
  };

  const template = new ACData.Template(templatePayload);

  const context = new ACData.EvaluationContext();
  context.$root = {
    companies,
  };

  context.registerFunction(
    'toString',
    (input) => input.toString(),
  );

  const cardAttach = {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: template.expand(context),
  };

  const text = '<small>Please update your Webex Teams app to view this content.</small>';
  await bot.reply(message, { markdown: text, attachments: cardAttach });
  await bot.deleteMessage({ id: message.messageId });
}

// Recieve confirmation from the user after they were sent a confirmation
async function processConfirmCWNotifications(companyId, bot, message) {
  // check if this notification already exists in Mongoose
  const Notification = mongoose.model('Notification');
  const notify = await Notification.find({ company_id: companyId });

  // get company object from CW
  const cw = new ConnectWiseRest({
    companyId: process.env.CW_COMPANY,
    companyUrl: 'connectwise.deandorton.com',
    clientId: process.env.CW_CLIENTID,
    publicKey: process.env.CW_PUBLIC_KEY,
    privateKey: process.env.CW_PRIVATE_KEY,
    debug: false, // optional, enable debug logging
  });

  let company;
  try {
    company = await cw.CompanyAPI.Companies.getCompanyById(companyId);
  } catch (e) {
    console.error(e);
  }

  // if a notification already exists, do not allow another one to be created
  let text;
  if (notify.length) {
    text = `A notification already exists for ${company.name} in `;

    const room = await bot.api.rooms.get(notify[0].room_id);
    text += room.title;

    if (room.teamId) {
      const team = await bot.api.teams.get(room.teamId);
      text += ` [${team.name}]`;
    }
  } else {
    text = `Adding notification for ${company.name}`;

    const newNotify = new Notification({ company_id: company.id, room_id: message.channel });
    newNotify.save();
  }

  await bot.reply(message, { markdown: text });
  await bot.deleteMessage({ id: message.messageId });
  console.log(`attachmentActions.js: processConfirmCWNotifications(): ${(await bot.api.people.get(message.personId)).displayName} added notification for ${company.name}`);
}

// Delete a given notification ID from Mongoose, and then respond to the message
//   with a confirmation
async function processDeleteCWNotifications(notificationId, bot, message) {
  // find notification to delete
  const Notification = mongoose.model('Notification');
  const notify = await Notification.findByIdAndRemove(notificationId);

  // create API connection to CW
  const cw = new ConnectWiseRest({
    companyId: process.env.CW_COMPANY,
    companyUrl: 'connectwise.deandorton.com',
    clientId: process.env.CW_CLIENTID,
    publicKey: process.env.CW_PUBLIC_KEY,
    privateKey: process.env.CW_PRIVATE_KEY,
    debug: false, // optional, enable debug logging
  });

  let name;
  if (notify.company_id) {
    const company = await cw.CompanyAPI.Companies.getCompanyById(notify.company_id);

    name = company.name;
  // board fallback notification
  } else if (notify.board_id) {
    const board = await cw.ServiceDeskAPI.Boards.getBoardById(notify.board_id);

    name = `Fallback: Board ${board.name}`;
  // global fallback notification
  } else {
    name = 'Fallback: All notifications</em>';
  }

  const text = `Deleted notification for ${name}`;
  await bot.reply(message, { markdown: text });
  await bot.deleteMessage({ id: message.messageId });
  console.log(`attachmentActions.js: processDeleteCWNotifications(): ${(await bot.api.people.get(message.personId)).displayName} deleted notification for ${name}`);
}

async function processMVSnapshot(cameraSerial, bot, message) {
  // Connect to Meraki API
  const configuration = meraki.Configuration;
  if (process.env.MERAKI_BASEURI) {
    configuration.BASEURI = process.env.MERAKI_BASEURI;
  }
  configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;
  const networkId = 'N_591660401045840345';

  // Get snapshot URL and live video link
  const input = {
    networkId,
    serial: cameraSerial,
  };

  let url;
  try {
    url = await meraki.CamerasController.generateNetworkCameraSnapshot(input);
    console.log(`attachmentActions.js: processMVSnapshot(): got snapshot URL for ${cameraSerial}`);
  } catch (e) {
    console.error(`attachmentActions.js: processMVSnapshot(): unable to get snapshot URL for ${cameraSerial}`);
    console.error(e);
    const text = `Sorry, I wasn't able to contact the camera to get a snapshot. <em>${e.message} (${e.code})</em>`;
    await bot.reply(message, { markdown: text });

    return;
  }

  let videoLinkUrl;
  try {
    videoLinkUrl = await meraki.CamerasController.getNetworkCameraVideoLink(input);
    console.log(`attachmentActions.js: processMVSnapshot(): got video link URL for ${cameraSerial}`);
  } catch (e) {
    console.error(`attachmentActions.js: processMVSnapshot(): unable to get video link URL for ${cameraSerial}`);
    console.error(e);
  }

  const tempMessage = await bot.reply(message, { markdown: 'Please wait about `5 seconds` while I locate your snapshot..' });
  await bot.deleteMessage({ id: message.messageId });

  let peopleCount;
  try {
    // eslint-disable-next-line max-len
    const cameraAnalyticsLive = await meraki.MVSenseController.getDeviceCameraAnalyticsLive(cameraSerial);
    peopleCount = cameraAnalyticsLive.zones['0'].person;
  } catch (e) {
    console.log('attachmentActions.js: processMVSnapshot() Meraki API getDeviceCameraAnalyticsLive call error');
    console.log(e);
  }

  // Get device data from Meraki
  let device;
  try {
    device = await meraki.DevicesController.getNetworkDevice({ serial: cameraSerial, networkId });

    console.log('attachmentActions.js: processMVSnapshot() Meraki API call success');
  } catch (e) {
    console.log('attachmentActions.js: processMVSnapshot() Meraki API getNetworkDevice call error');
    console.log(e);
  }
  let text = `**${device.name}** detected `;
  if (peopleCount === 1) {
    text += '1 person.';
  } else {
    text += `${peopleCount} people`;
  }
  text += ` [Live Video](${videoLinkUrl.url})`;

  await sleep(5000);
  await bot.reply(message, { markdown: text, files: [url.url] });
  await bot.deleteMessage({ id: tempMessage.id });
}

async function processMVInfo(cameraSerial, bot, message) {
  const networkId = 'N_591660401045840345';

  // Connect to Meraki API
  const configuration = meraki.Configuration;
  configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;

  // Get device data from Meraki
  let device;
  try {
    device = await meraki.DevicesController.getNetworkDevice({ serial: cameraSerial, networkId });

    console.log('attachmentActions.js: processMVInfo() Meraki API call success');
  } catch (e) {
    console.log('attachmentActions.js: processMVInfo() Meraki API call error');
    console.log(e);
  }

  const templatePayload = {
    type: 'AdaptiveCard',
    version: '1.1',
    body: [
      {
        type: 'TextBlock',
        size: 'Medium',
        weight: 'Bolder',
        text: '{title}',
      },
      {
        type: 'FactSet',
        facts: [
          {
            $data: '{properties}',
            title: '{key}:',
            value: '{value}',
          },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Snapshot',
        data: {
          id: 'submit_mv_list_snapshot',
          mv_list_serial: device.serial,
        },
      },
    ],
  };

  const template = new ACData.Template(templatePayload);

  const context = new ACData.EvaluationContext();
  context.$root = {
    title: device.name,
    properties: [
      {
        key: 'Model',
        value: device.model,
      },
      {
        key: 'Serial',
        value: device.serial,
      },
      {
        key: 'MAC',
        value: device.mac,
      },
      {
        key: 'IP',
        value: device.lanIp,
      },
      {
        key: 'Firmware',
        value: device.firmware,
      },
      {
        key: 'Address',
        value: device.address,
      },
    ],
  };

  const cardAttach = {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: template.expand(context),
  };

  const text = '<small>Please update your Webex Teams app to view this content.</small>';
  await bot.reply(message, { markdown: text, attachments: cardAttach });
  await bot.deleteMessage({ id: message.messageId });
}

/* related functions */

function sleep(ms) {
  console.log(`meraki-snapshot.js: sleeping ${ms}ms`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
