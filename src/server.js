const Hapi = require("@hapi/hapi");
require("dotenv").config(); // Load environment variables from .env file
const { answer } = require("./routes/answer.js");
const profileRoutes = require("./routes/profile.js");

// Use environment variable for port, default to 8080 if not set
const PORT = process.env.PORT || 8080;

const init = async () => {
  const server = Hapi.server({
    port: PORT,
    host: "0.0.0.0", // Listen on all network interfaces
  });

  server.route(answer);
  profileRoutes.forEach((route) => {
    server.route(route);
  });

  await server.start();
  console.log(`Server is running on ${server.info.uri}`);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
