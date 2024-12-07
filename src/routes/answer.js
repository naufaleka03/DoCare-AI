const { generate, search } = require('../handler/answerHandler.js');

const answer = {
    method: 'POST',
    path: '/query',
    handler: async (request, h) => {
        try {
            const question = request.payload;
            const query = question.query;

            if (!query) {
                return h.response({ error: 'Query is required' }).code(400);
            }

            const result = await search(query);
            const response = await generate(result, query);

            return h.response({ response });
        } catch (e) {
            return h.response({ error: e.message }).code(500);
        }
    }
};

module.exports = { answer };