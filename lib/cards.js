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
};
