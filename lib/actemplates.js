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

};
