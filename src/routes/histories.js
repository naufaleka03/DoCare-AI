const { getHistories } = require("../handler/historiesHandler.js");

const histories = {
  method: "GET",
  path: "/histories/{userId}",
  handler: async (request, h) => {
    try {
      const { userId } = request.params;

      if (!userId) {
        return h
          .response({
            status: "error",
            message: "UserId is required",
          })
          .code(400);
      }

      const histories = await getHistories(userId);

      return h
        .response({
          status: "success",
          data: histories,
        })
        .code(200);
    } catch (error) {
      console.error("Error getting histories:", error);
      return h
        .response({
          status: "error",
          message: "Failed to get histories",
        })
        .code(500);
    }
  },
};

module.exports = { histories };
