/* tools/cw-project.js
 *
 * Methods related to CW projects
 */

const cards = require('../lib/cards');

module.exports = {

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

      const text = `Project #${project.id}: ${project.name}`;
      // Create 'Project Ticket' card
      const template = cards.template(cards.project_ticket);
      const context = cards.context({
        project,
        projectTickets,
      });
      const card = {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: template.expand(context),
      };

      return { text, card };
    } catch (e) {
      console.log(`connectwise.js: error in getMessageForProject using project ID ${projectId}`);
      console.error(e);

      throw (e);
    }
  },
};
