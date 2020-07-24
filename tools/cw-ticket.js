/* tools/cw-ticket.js
 *
 * Methods related to CW tickets
 */
const ConnectWiseRest = require('connectwise-rest');
const ACData = require('adaptivecards-templating');

const utility = require('./utility');

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

    // template for ServiceTicket
    const templatePayload = {
      type: 'AdaptiveCard',
      version: '1.1',
      body: [
        {
          type: 'Container',
          style: '{if(actionText, \'warning\', \'emphasis\')}',
          bleed: true,
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'TextBlock',
                      size: 'Medium',
                      weight: 'Bolder',
                      text: '[{friendlyTicketType(ticket.recordType)} #{ticket.id}](https://connectwise.deandorton.com/v4_6_release/services/system_io/Service/fv_sr100_request.rails?service_recid={ticket.id}&companyName=ddaf)',
                    },
                  ],
                  width: '6',
                },
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '{toUpperCase(actionText)}',
                      size: 'Medium',
                      weight: 'Bolder',
                      color: 'attention',
                      horizontalAlignment: 'Right',
                    },
                  ],
                  width: '2',
                  $when: '{actionText != \'\'}',
                },
              ],
            },
          ],
        },
        {
          type: 'TextBlock',
          size: 'Large',
          text: '{ticket.summary}',
          wrap: true,
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: 'Status',
              value: '{friendlyStatusName(ticket.status)}',
            },
            {
              title: 'Requester',
              value: '[{ticket.contactName}]({ticket.contactEmailAddress}) at {ticket.company.name}',
            },
            {
              title: 'Assigned to',
              value: '{friendlyAssigneeName(ticket.owner,ticket.board)}',
            },
          ],
        },
        {
          type: 'Container',
          style: 'accent',
          items: [
            {
              type: 'Container',
              separator: true,
              items: [
                {
                  type: 'TextBlock',
                  text: '[PROJECT #{ticket.project.id}](https://connectwise.deandorton.com/v4_6_release/services/system_io/router/openrecord.rails?recordType=ProjectHeaderFV&recid={ticket.project.id}&companyName=ddaf)',
                  weight: 'Bolder',
                  separator: true,
                },
              ],
            },
            {
              type: 'TextBlock',
              text: '{ticket.project.name}',
              size: 'Medium',
            },
            {
              type: 'TextBlock',
              text: 'Use `/cw p {ticket.project.id}` for project details.',
              wrap: true,
            },
          ],
          $when: "{ticket.recordType == 'ProjectTicket'}",
        },
      ],
      actions: [
        {
          type: 'Action.ShowCard',
          title: 'Show notes',
          card: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'Container',
                style: 'emphasis',
                items: [
                  {
                    type: 'ColumnSet',
                    columns: [
                      {
                        type: 'Column',
                        items: [
                          {
                            type: 'TextBlock',
                            weight: 'Bolder',
                            text: 'DATE/TIME',
                          },
                        ],
                        width: 40,
                      },
                      {
                        type: 'Column',
                        spacing: 'Large',
                        items: [
                          {
                            type: 'TextBlock',
                            weight: 'Bolder',
                            text: 'UPDATED BY',
                          },
                        ],
                        width: 60,
                      },
                    ],
                  },
                ],
              },
              {
                type: 'Container',
                $data: '{ticketNotes}',
                separator: true,
                items: [
                  {
                    type: 'ColumnSet',
                    columns: [
                      {
                        type: 'Column',
                        items: [
                          {
                            type: 'TextBlock',
                            text: '{friendlyDate(dateCreated)}',
                            wrap: true,
                            weight: 'Bolder',
                          },
                        ],
                        width: 40,
                      },
                      {
                        type: 'Column',
                        spacing: 'Medium',
                        items: [
                          {
                            type: 'TextBlock',
                            text: '{friendlyNoteName($data)}',
                            wrap: true,
                            weight: 'Bolder',
                          },
                        ],
                        width: 60,
                      },
                    ],
                  },
                  {
                    type: 'RichTextBlock',
                    inlines: [
                      {
                        type: 'TextRun',
                        text: '{text}',
                      },
                    ],
                    $when: '{text}',
                  },
                ],
              },
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          },
          $when: '{ticketNotes.length > 0}',
        },
        {
          type: 'Action.ShowCard',
          title: 'Add comment',
          card: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'Input.Text',
                id: 'cw_add_comment',
                placeholder: 'Add your comment..',
                isMultiline: true,
              },
              {
                type: 'ColumnSet',
                columns: [
                  {
                    type: 'Column',
                    width: 'stretch',
                    items: [
                      {
                        type: 'Input.ChoiceSet',
                        id: 'cw_comment_visibility',
                        choices: [
                          {
                            title: 'Public (send to client)',
                            value: 'public',
                          },
                          {
                            title: 'Private',
                            value: 'private',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'Column',
                    width: 'stretch',
                    items: [
                      {
                        type: 'Input.ChoiceSet',
                        id: 'cw_new_status_id',
                        value: '{toString($root.ticket.status.id)}',
                        choices: [
                          {
                            $data: '{statusOptions}',
                            title: '{friendlyStatusName($data,$root.ticket.status.id)}',
                            value: '{toString(id)}',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
            actions: [
              {
                type: 'Action.Submit',
                title: 'Send',
                data: {
                  id: 'submit_cw_add_comment',
                  ticketId: '{ticket.id}',
                  cw_current_status_id: '{status.id}',
                },
              },
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          },
        },
        {
          type: 'Action.Submit',
          title: 'Assign to Me',
          data: {
            id: 'cw_ticket_assign_self',
            ticketId: '{ticket.id}',
          },
        },
      ],
    };

    const template = new ACData.Template(templatePayload);

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

    // "ServiceTicket" to "Service Ticket"
    const ticketTypeText = ticket.recordType.replace(/([A-Z])/g, ' $1').trim();

    // Create the text version of the message (for incompatible clients and client notifications)
    let text = '';
    if (action) {
      text += `${actionText} `;
    }
    text += `${ticketTypeText} #${ticket.id}: ${ticket.summary} (${ticket.contactName} at ${ticket.company.name})`;
    console.log(`/connectwise.js getMessageForTicket(): ${text}`);

    // generate card for non-ProjectTicket
    const context = new ACData.EvaluationContext();
    context.$root = {
      actionText,
      ticket,
      ticketNotes: serviceNotes,
      statusOptions: statuses,
    };

    context.registerFunction(
      'friendlyDate',
      (input) => utility.date_string_format_long_with_time(input),
    );

    context.registerFunction(
      'friendlyTicketType',
      (input) => input.replace(/([A-Z])/g, ' $1').trim(),
    );

    context.registerFunction(
      'friendlyNoteName',
      (input) => {
        let txt = '';

        if (input.contact) {
          txt += input.contact.name;
        } else if (input.member) {
          txt += input.member.name;
        } else {
          txt += 'Unspecified Name';
        }

        if (input.internalAnalysisFlag) {
          txt += ' [Internal Note]';
        }

        return txt;
      },
    );

    context.registerFunction(
      'friendlyAssigneeName',
      (owner, board) => {
        let txt = '';

        if (owner && !(owner.name === 'undefined')) {
          txt += `${owner.name} `;
        }

        if (board) {
          txt += `[${board.name}]`;
        }

        return txt;
      },
    );

    context.registerFunction(
      'friendlyStatusName',
      (status, currentStatusId) => {
        let txt = status.name.replace('>', '');

        if (status.id === currentStatusId) {
          txt += ' (current status)';
        }

        return txt;
      },
    );

    context.registerFunction(
      'toString',
      (input) => input.toString(),
    );

    context.registerFunction(
      'toUpperCase',
      (input) => input.toUpperCase(),
    );

    const cardAttach = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: template.expand(context),
    };

    // total length of data being posted to webex
    const length = text.length + JSON.stringify(cardAttach).length;
    console.log(`/connectwise.js: post length in chars ${length}`);
    return { text, cardAttach, ticket };
  // end of getMessageForTicket
  },
};
