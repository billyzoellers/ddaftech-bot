/* tools/cw-ticket.js
 *
 * Methods related to CW tickets
 */
const ConnectWiseRest = require('connectwise-rest');
const cards = require('../lib/cards');

module.exports = {

  /*
   * getMessageForTicket(ticketId,options)
   *
   *      Input: CW ticket ID (String)
   *      Output: formatted message to send back {(String)markdown, (String)card_attachment}
   */
  getMessageForTicket: async (ticketId, options) => {
    const { action } = options;

    // create API connection
    const cw = new ConnectWiseRest({
      companyId: process.env.CW_COMPANY,
      companyUrl: 'connectwise.deandorton.com',
      clientId: process.env.CW_CLIENTID,
      publicKey: process.env.CW_PUBLIC_KEY,
      privateKey: process.env.CW_PRIVATE_KEY,
      debug: false, // optional, enable debug logging
    });

    // Make API requests for ticket data
    let ticket;
    try {
      ticket = await cw.ServiceDeskAPI.Tickets.getTicketById(ticketId);
    } catch (e) {
      console.log(`cw-ticket.js: error on getTicketById with ticketId ${ticketId}`);
      console.error(e);

      throw (e);
    }

    let serviceNotes;
    try {
      const params = {
        orderby: 'dateCreated desc',
      };

      serviceNotes = await cw.ServiceDeskAPI.ServiceNotes.getServiceNotes(ticketId, params);
    } catch (e) {
      console.log(`cw-ticket.js: error on getServiceNotes with ticketId ${ticketId}`);
      console.error(e);

      throw (e);
    }

    // Make API request for status options
    let statuses;
    try {
      const params = {
        orderby: 'sortOrder asc',
        conditions: 'inactive=false',
      };

      statuses = await cw.ServiceDeskAPI.Statuses.getStatusesByBoardId(ticket.board.id, params);
    } catch (e) {
      console.log(`cw-ticket.js: error on getStatusesByBoardId with boardId ${ticket.board.id}`);
      console.error(e);

      throw (e);
    }
    let actionText;
    if (action) {
      switch (action) {
        case 'updated':
          actionText = 'Updated';
          break;
        case 'added':
          actionText = 'New';
          break;
        default:
          break;
      }
    }

    // friendly text formatting
    const ticketTypeText = ticket.recordType.replace(/([A-Z])/g, ' $1').trim();
    const ticketStatusText = ticket.status.name.replace('>', '');
    let ticketAssigneeNameText = '';
    if (ticket.owner && !(ticket.owner.name === 'undefined')) {
      ticketAssigneeNameText += `${ticket.owner.name} `;
    }
    if (ticket.board) {
      ticketAssigneeNameText += `[${ticket.board.name}]`;
    }

    // Create the text version of the message (for incompatible clients and client notifications)
    let text = '';
    if (action) {
      text += `${actionText} `;
    }
    text += `${ticketTypeText} #${ticket.id}: ${ticket.summary} (${ticket.contactName} at ${ticket.company.name})`;
    console.log(`/connectwise.js getMessageForTicket(): ${text}`);

    // Create 'Service Ticket' card
    const template = cards.template(cards.service_ticket);
    const context = cards.context({
      ticketTypeText,
      actionText,
      ticketStatusText,
      ticketAssigneeNameText,
      ticket,
      ticketNotes: serviceNotes,
      statusOptions: statuses,
    });
    const card = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: template.expand(context),
    };

    // total length of data being posted to webex
    return { text, card, ticket };
  // end of getMessageForTicket
  },
};
