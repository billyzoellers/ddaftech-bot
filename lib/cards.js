// ddaftech-bot / cards.js
const util = require('util');
const ACData = require('adaptivecards-templating');

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
        $when: '${currentNotifications.length > 0}',
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
        $when: '${currentNotifications.length > 0}',
      },
    ],
  },
};
