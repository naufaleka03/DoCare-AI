const { generate, search } = require("../handler/answerHandler.js");
const { saveHistory } = require("../handler/historiesHandler.js");

const answer = {
  method: "POST",
  path: "/query",
  handler: async (request, h) => {
    try {
      if (!request.payload) {
        return h
          .response({
            status: "error",
            message: "Request payload is required",
          })
          .code(400);
      }

      const { query, userId } = request.payload;

      if (!query || !userId) {
        return h
          .response({
            status: "error",
            message: "Query and userId are required",
          })
          .code(400);
      }

      const result = await search(query);

      if (!result.length) {
        return h
          .response({
            status: "no_results",
            message: "No information found for your query.",
            query: query,
          })
          .code(404);
      }

      const response = await generate(result, query);

      // Save chat history
      await saveHistory(userId, { query, response });

      return h.response({
        status: "success",
        response,
        query: query,
        context_length: result.length,
      });
    } catch (e) {
      console.error("Error processing query:", e);
      return h
        .response({
          status: "error",
          message: "An error occurred while processing your request",
          error: e.message,
        })
        .code(500);
    }
  },
};

module.exports = { answer };
