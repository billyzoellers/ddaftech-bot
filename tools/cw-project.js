/* tools/cw-project.js
 *
 * Methods related to CW projects
 */

const utility = require('./utility');

module.exports = {

  /*
    *
    *
    *
    *
    *
    *
    */
  getMessageForProject: async (cw, projectId) => {
    // Make API requests for ticket data
    try {
      const project = await cw.ProjectAPI.Projects.getProjectById(projectId);

      const params = {
        conditions: `project/id=${project.id}`,
      };

      const projectTickets = await cw.ServiceDeskAPI.Tickets.getTickets(params);

      // console.log(project);
      // console.log(projectTickets[0]);

      const text = await module.exports.getTextMessageForProject(project, projectTickets);
      const card = await module.exports.getAdaptiveCardForProject(project, projectTickets);

      return { text, card };
    } catch (e) {
      console.log(`connectwise.js: error in getMessageForProject using project ID ${projectId}`);
      console.error(e);

      throw (e);
    }
  },
  /*
  *
  *
  *
  *
  *
  *
  */
  getTextMessageForProject: async (project) => {
    const text = `Project #${project.id}: ${project.name}`;

    return text;
  },
  /*
  *
  *
  *
  *
  *
  *
  */
  getAdaptiveCardForProject: async (project, projectTickets) => {
    const cardBody = [];

    // HEADER
    cardBody.push({
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
                  text: `[PROJECT #${project.id}](https://connectwise.deandorton.com/v4_6_release/services/system_io/router/openrecord.rails?recordType=ProjectHeaderFV&recid=${project.id}&companyName=ddaf) [${project.type.name}]`,
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
                  text: project.status.name.toUpperCase(),
                  wrap: true,
                },
              ],
              width: 'auto',
            },
          ],
        },
      ],
    });

    // TITLE LINE
    cardBody.push({
      type: 'Container',
      items: [
        {
          type: 'TextBlock',
          size: 'Large',
          text: project.name,
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
                      text: utility.date_string_format_short(project.estimatedStart),
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
                      text: utility.date_string_format_short(project.estimatedEnd),
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
                      text: `${project.actualHours}h`,
                      color: (project.actualHours > project.budgetHours ? 'attention' : 'good'),
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
                      text: `${project.budgetHours}h`,
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
                  text: `${project.contact.name} at **${project.company.name}**`,
                  horizontalAlignment: 'right',
                  spacing: 'small',
                },
                {
                  type: 'TextBlock',
                  text: `${project.manager.name} *[${project.board.name}]*`,
                  horizontalAlignment: 'right',
                  spacing: 'small',
                },
              ],
            },
          ],
        },
      ],
    });

    // create a container for each workplan item
    const workplanBody = [];
    for (let i = 0; i < projectTickets.length; i += 1) {
      workplanBody.push({
        type: 'Container',
        style: 'accent',
        items: [
          {
            type: 'TextBlock',
            text: `${projectTickets[i].wbsCode} ${projectTickets[i].summary} [#${projectTickets[i].id}](https://connectwise.deandorton.com/v4_6_release/services/system_io/Service/fv_sr100_request.rails?service_recid=${projectTickets[i].id}&companyName=ddaf)`,
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
                    text: utility.formatStatus(projectTickets[i].status.name) + (projectTickets[i].owner ? ` - Assigned to ${projectTickets[i].owner.name}` : ''),
                  },
                ],
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: `${projectTickets[i].actualHours ? projectTickets[i].actualHours : '0'}h / ${projectTickets[i].budgetHours ? projectTickets[i].budgetHours : '0'}h`,
                    color: ((projectTickets[i].actualHours ? projectTickets[i].actualHours : '0') > (projectTickets[i].budgetHours ? projectTickets[i].budgetHours : '0') ? 'attention' : 'good'),
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    // create actionset
    const cardActions = [];
    cardActions.push({
      type: 'Action.ShowCard',
      title: 'Work Plan',
      card: {
        type: 'AdaptiveCard',
        body: workplanBody,
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      },
    });

    // add headers to card before attaching
    const cardAttach = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.1',
        body: cardBody,
        actions: cardActions,
      },
    };

    return cardAttach;
  },
};
