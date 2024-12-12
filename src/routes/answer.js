const { generate, search } = require('../handler/answerHandler.js');

const answer = {
    method: 'POST',
    path: '/query',
    handler: async (request, h) => {
        try {
            const question = request.payload;
            const query = question.query;

            if (!query) {
                return h.response({ 
                    status: 'error',
                    message: 'Query is required'
                }).code(400);
            }

            const result = await search(query);
            
            // Handle empty results more gracefully
            if (!result.length) {
                return h.response({
                    status: 'no_results',
                    message: 'No information found for your query.',
                    query: query
                }).code(404);
            }
            
            const response = await generate(result, query);

            return h.response({ 
                status: 'success',
                response,
                query: query,
                context_length: result.length
            });
        } catch (e) {
            console.error('Error processing query:', e);
            return h.response({ 
                status: 'error',
                message: 'An error occurred while processing your request',
                error: e.message
            }).code(500);
        }
    }
};

module.exports = { answer };