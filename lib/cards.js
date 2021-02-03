// ddaftech-bot / cards.js
const util = require('util');
const ACData = require('adaptivecards-templating');
const card_merakimv_select = require('./card_json/merakimv_select.json');

/* eslint-disable no-template-curly-in-string */

// ** Begin common card parts (??) **/

module.exports = {
  /* acTemplate: return a new ACData.Template with format
   *
   */
  template: (template) => new ACData.Template(template),

  /* acEvaluationContext: return a new ACData.EvaulationContext with registered helper
   *                      functions and $root from input
   *
   */
  context: (root) => {
    const context = {
      $root: root,
    };

    return context;
  },

  /* debug: accept a card's json, and print it to screen in a readable format
   *
   *
   */
  debug: (card) => {
    console.log(util.inspect(JSON.stringify(card.content), false, null, true));
  },

  /* Begin card templates */

  service_ticket: {
    type: 'AdaptiveCard',
    version: '1.1',
    body: [
      {
        type: 'Container',
        style: '${if(actionText, \'warning\', \'emphasis\')}',
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
                    text: '[${ticketTypeText} #${ticket.id}](https://connectwise.deandorton.com/v4_6_release/services/system_io/Service/fv_sr100_request.rails?service_recid=${ticket.id}&companyName=ddaf)',
                  },
                ],
                width: '6',
              },
              {
                type: 'Column',
                items: [
                  {
                    type: 'TextBlock',
                    text: '${toUpper(actionText)}',
                    size: 'Medium',
                    weight: 'Bolder',
                    color: 'attention',
                    horizontalAlignment: 'Right',
                  },
                ],
                width: '2',
                $when: '${exists(actionText)}',
              },
            ],
          },
        ],
      },
      {
        type: 'TextBlock',
        size: 'Large',
        text: '${ticket.summary}',
        wrap: true,
      },
      {
        type: 'FactSet',
        facts: [
          {
            title: 'Status',
            value: '${ticketStatusText}',
          },
          {
            title: 'Requester',
            value: '[${ticket.contactName}](${ticket.contactEmailAddress}) at ${ticket.company.name}',
          },
          {
            title: 'Assigned to',
            value: '${ticketAssigneeNameText}',
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
                text: '[PROJECT #${ticket.project.id}](https://connectwise.deandorton.com/v4_6_release/services/system_io/router/openrecord.rails?recordType=ProjectHeaderFV&recid=${ticket.project.id}&companyName=ddaf)',
                weight: 'Bolder',
                separator: true,
              },
            ],
          },
          {
            type: 'TextBlock',
            text: '${ticket.project.name}',
            size: 'Medium',
          },
          {
            type: 'TextBlock',
            text: 'Use **/cw p ${ticket.project.id}** for project details.',
            wrap: true,
          },
        ],
        $when: "${ticket.recordType == 'ProjectTicket'}",
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
              $data: '${ticketNotes}',
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
                          text: '${convertFromUTC(replace(dateCreated,\'Z\',\'.000Z\'), \'Eastern Standard Time\', \'ddd, M/d/yy h:mm tt\')}',
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
                          text: '${if(contact, contact.name, if(member, member.name, \'Unspecified Name\'))}${if(internalAnalysisFlag, \' [Internal Note]\', \'\')}',
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
                      text: '${text}',
                    },
                  ],
                  $when: '${text != \'\'}',
                },
              ],
            },
          ],
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        },
        $when: '${count(ticketNotes) > 0}',
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
                      value: '${string($root.ticket.status.id)}',
                      choices: [
                        {
                          $data: '${statusOptions}',
                          title: '${name}',
                          value: '${string(id)}',
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
                ticketId: '${ticket.id}',
                cw_current_status_id: '${ticket.status.id}',
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
          ticketId: '${ticket.id}',
        },
      },
    ],
  },

  /* 'List of tickets' card
   *
   */
  ticket_list: {
    type: 'AdaptiveCard',
    version: '1.1',
    body: [
      {
        type: 'Container',
        spacing: 'Large',
        items: [
          {
            type: 'TextBlock',
            text: 'Most Recently Updated ${count(tickets)} out of ${allTicketsCount} tickets for ${forEntity}',
            size: 'Small',
          },
        ],
      },
      {
        type: 'Container',
        spacing: 'Large',
        style: 'emphasis',
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
                    weight: 'Bolder',
                    text: 'ID',
                  },
                ],
                width: 10,
              },
              {
                type: 'Column',
                spacing: 'Large',
                items: [
                  {
                    type: 'TextBlock',
                    weight: 'Bolder',
                    text: 'REQUESTER',
                  },
                ],
                width: 75,
              },
              {
                type: 'Column',
                spacing: 'Large',
                items: [
                  {
                    type: 'TextBlock',
                    weight: 'Bolder',
                    text: 'STATUS',
                    horizontalAlignment: 'Right',
                  },
                ],
                width: 15,
              },
            ],
          },
        ],
      },
      {
        type: 'Container',
        style: 'emphasis',
        bleed: true,
        $data: '${tickets}',
        items: [
          {
            type: 'ColumnSet',
            spacing: 'None',
            columns: [
              {
                type: 'Column',
                items: [
                  {
                    type: 'TextBlock',
                    text: '#${string(id)}',
                    wrap: false,
                    weight: 'Lighter',
                    size: 'Small',
                    color: 'Accent',
                  },
                ],
                width: 10,
              },
              {
                type: 'Column',
                items: [
                  {
                    type: 'TextBlock',
                    text: '[${contactName}](${contactEmailAddress}) at ${company.name}',
                    wrap: false,
                    weight: 'Lighter',
                    size: 'Small',
                  },
                ],
                width: 75,
              },
              {
                type: 'Column',
                items: [
                  {
                    type: 'TextBlock',
                    text: '${replace(status.name, \'>\', \'\')}',
                    wrap: false,
                    weight: 'Lighter',
                    size: 'Small',
                    horizontalAlignment: 'Right',
                    color: 'Accent',
                  },
                ],
                width: 15,
              },
            ],
          },
          {
            type: 'TextBlock',
            text: '${summary}',
            wrap: false,
            weight: 'Lighter',
            size: 'Small',
          },
        ],
      },
    ],
  },
  /* project_ticket card */
  project_ticket: {
    type: 'AdaptiveCard',
    version: '1.1',
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
                    size: 'Medium',
                    weight: 'Bolder',
                    text: '[PROJECT #${project.id}](https://connectwise.deandorton.com/v4_6_release/services/system_io/router/openrecord.rails?recordType=ProjectHeaderFV&recid=${project.id}&companyName=ddaf) [${project.type.name}]',
                  },
                ],
                width: 'stretch',
              },
              {
                type: 'Column',
                items: [
                  {
                    type: 'TextBlock',
                    size: 'Medium',
                    weight: 'Bolder',
                    text: '${toUpper(project.status.name)}',
                    wrap: true,
                  },
                ],
                width: 'auto',
              },
            ],
          },
        ],
      },
      {
        type: 'Container',
        items: [
          {
            type: 'TextBlock',
            size: 'Large',
            text: '${project.name}',
            wrap: true,
          },
          {
            type: 'Container',
            style: 'accent',
            items: [
              {
                type: 'ColumnSet',
                spacing: 'medium',
                separator: false,
                columns: [
                  {
                    type: 'Column',
                    width: 1,
                    items: [
                      {
                        type: 'TextBlock',
                        text: 'EST START',
                        isSubtle: true,
                        horizontalAlignment: 'center',
                        weight: 'bolder',
                      },
                      {
                        type: 'TextBlock',
                        text: '${convertFromUTC(replace(project.estimatedStart,\'Z\',\'.000Z\'), \'Eastern Standard Time\', \'M/d/yy\')}',
                        weight: 'bolder',
                        horizontalAlignment: 'center',
                        spacing: 'small',
                      },
                    ],
                  },
                  {
                    type: 'Column',
                    width: 1,
                    items: [
                      {
                        type: 'TextBlock',
                        text: 'EST END',
                        isSubtle: true,
                        horizontalAlignment: 'right',
                        weight: 'bolder',
                      },
                      {
                        type: 'TextBlock',
                        text: '${convertFromUTC(replace(project.estimatedEnd,\'Z\',\'.000Z\'), \'Eastern Standard Time\', \'M/d/yy\')}',
                        horizontalAlignment: 'right',
                        weight: 'bolder',
                        spacing: 'small',
                      },
                    ],
                  },
                  {
                    type: 'Column',
                    width: 1,
                  },
                  {
                    type: 'Column',
                    width: 1,
                    items: [
                      {
                        type: 'TextBlock',
                        text: 'CHARGED',
                        isSubtle: true,
                        horizontalAlignment: 'center',
                        weight: 'bolder',
                      },
                      {
                        type: 'TextBlock',
                        text: '${project.actualHours}h',
                        color: '${if(project.actualHours > project.budgetHours, \'attention\', \'good\')}',
                        weight: 'bolder',
                        horizontalAlignment: 'center',
                        spacing: 'small',
                      },
                    ],
                  },
                  {
                    type: 'Column',
                    width: 1,
                    items: [
                      {
                        type: 'TextBlock',
                        text: 'BUDGET',
                        isSubtle: true,
                        horizontalAlignment: 'right',
                        weight: 'bolder',
                      },
                      {
                        type: 'TextBlock',
                        text: '${project.budgetHours}h',
                        horizontalAlignment: 'right',
                        weight: 'bolder',
                        spacing: 'small',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'ColumnSet',
            separator: false,
            spacing: 'medium',
            columns: [
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: 'Client',
                    spacing: 'small',
                  },
                  {
                    type: 'TextBlock',
                    text: 'Project Lead',
                    spacing: 'small',
                  },
                ],
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: '${project.contact.name} at **${project.company.name}**',
                    horizontalAlignment: 'right',
                    spacing: 'small',
                  },
                  {
                    type: 'TextBlock',
                    text: '${project.manager.name} *[${project.board.name}]*',
                    horizontalAlignment: 'right',
                    spacing: 'small',
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
        type: 'Action.ShowCard',
        title: 'Work Plan',
        card: {
          type: 'AdaptiveCard',
          body: [
            {
              type: 'Container',
              style: 'accent',
              $data: '${tickets}',
              items: [
                {
                  type: 'TextBlock',
                  text: '${wbsCode} ${summary} [#${id}](https://connectwise.deandorton.com/v4_6_release/services/system_io/Service/fv_sr100_request.rails?service_recid=${id}&companyName=ddaf)',
                  size: 'Medium',
                  weight: 'Bolder',
                },
                {
                  type: 'ColumnSet',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        {
                          type: 'TextBlock',
                          text: '${status.name} ${if(owner, concat(\'- Assigned to \', owner.name), \'\')}',
                        },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [
                        {
                          type: 'TextBlock',
                          text: '${if(actualHours, actualHours, \'0\')}h / ${if(budgetHours, budgetHours, \'0\')}h',
                          color: '${if(if(actualHours, actualHours, 0) > if(budgetHours, budgetHours, 0), \'attention\', \'good\')}',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        },
      },
    ],
  },

  /* addRemoveNotification: used for /cw notifications
   *
   * input:
   *     spaceName: title of the room the command is called from,
   *     currentNotifications: array of the data structure below
   *        {
   *          key: type of notification 'Company' or 'Fallback',
   *          value: Company name, Board name, 'All notifications',
   *          id: Id of Notification in MongoDB,
   *        }
   */
  notification_addremove: {
    type: 'AdaptiveCard',
    version: '1.1',
    body: [
      {
        type: 'TextBlock',
        size: 'Medium',
        weight: 'Bolder',
        text: 'Notifications for \'${spaceName}\'',
      },
      {
        type: 'FactSet',
        facts: [
          {
            $data: '${currentNotifications}',
            title: '${key}:',
            value: '${value}',
          },
        ],
        $when: '${count(currentNotifications) > 0}',
      },
    ],
    actions: [
      {
        type: 'Action.ShowCard',
        title: 'New',
        card: {
          type: 'AdaptiveCard',
          body: [
            {
              type: 'Input.Text',
              id: 'company_name',
              placeholder: 'Company Name',
            },
          ],
          actions: [
            {
              type: 'Action.Submit',
              title: 'Add',
              data: {
                id: 'add_cw_notification',
              },
            },
          ],
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        },
      },
      {
        type: 'Action.ShowCard',
        title: 'Edit',
        card: {
          type: 'AdaptiveCard',
          body: [
            {
              type: 'Input.ChoiceSet',
              placeholder: 'select camera',
              choices: [
                {
                  $data: '${currentNotifications}',
                  title: '${value}',
                  value: '${id}',
                },
              ],
              id: 'cw_notifications_edit',
            },
          ],
          actions: [
            {
              type: 'Action.Submit',
              title: 'Delete',
              data: {
                id: 'delete_cw_notification',
              },
            },
          ],
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        },
        $when: '${count(currentNotifications) > 0}',
      },
    ],
  },
  /* 'Select Meraki MV' card */
  merakimv_select: card_merakimv_select,

  merakimv_info: {
    type: 'AdaptiveCard',
    version: '1.1',
    body: [
      {
        type: 'TextBlock',
        size: 'Medium',
        weight: 'Bolder',
        text: '${title}',
      },
      {
        type: 'FactSet',
        facts: [
          {
            $data: '${properties}',
            title: '${key}:',
            value: '${value}',
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
          mv_list_serial: '${serial}',
        },
      },
    ],
  },
};
