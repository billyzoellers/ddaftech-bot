const ACData = require('adaptivecards-templating');

module.exports = {

  /* acTemplate: return a new ACData.Template with the template formatting
   *
   */
  acTemplate: (template) => new ACData.Template(template),

  /* acEvaluationContext: return a new ACData.EvaluationContext with registered helper functions
   *                      and $root from input
   *
   */
  acEvaluationContext: (root) => {
    const context = new ACData.EvaluationContext();

    context.$root = root;

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
      'projectName',
      (input) => {
        if (input) {
          return ` - Project: ${input}`;
        }

        return '';
      },
    );

    context.registerFunction(
      'toUpperCase',
      (input) => input.toUpperCase(),
    );

    context.registerFunction(
      'shorten',
      (string, length) => string.substring(0, 33) + (string.length > length ? '...' : ''),
    );

    return context;
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
  addRemoveNotification: {
    type: 'AdaptiveCard',
    version: '1.1',
    body: [
      {
        type: 'TextBlock',
        size: 'Medium',
        weight: 'Bolder',
        text: 'Notifications for \'{spaceName}\'',
      },
      {
        type: 'FactSet',
        facts: [
          {
            $data: '{currentNotifications}',
            title: '{key}:',
            value: '{value}',
          },
        ],
        $when: '{currentNotifications.length > 0}',
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
                  $data: '{currentNotifications}',
                  title: '{value}',
                  value: '{id}',
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
        $when: '{currentNotifications.length > 0}',
      },
    ],
  },

  /* ticketList: used for /cw tickets
   *
   * input:
   *     tickets: an array of ConnectWise::Ticket objects,
   *     allTicketsCount: numercial amount of total tickets vs tickets in {tickets} array,
   *     forEntity: "Tickets for {forEntity}"
   */
  ticketList: {
    type: 'AdaptiveCard',
    version: '1.1',
    body: [
      {
        type: 'Container',
        spacing: 'Large',
        items: [
          {
            type: 'TextBlock',
            text: 'Most Recently Created {tickets.length} out of {allTicketsCount} tickets for {forEntity}',
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
        $data: '{tickets}',
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
                    text: '#{toString(id)}',
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
                    text: '[{contactName}]({contactEmailAddress}) at {shorten(company.name,33)}',
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
                    text: '{friendlyStatusName(status,0)}',
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
            text: '{summary}{projectName(project.name)}',
            wrap: false,
            weight: 'Lighter',
            size: 'Small',
          },
        ],
      },
    ],
  },

};
