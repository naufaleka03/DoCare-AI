const Hapi = require('@hapi/hapi');
const { answer } = require('./routes/answer');

const init = async () => {
    const server = Hapi.server({
        port: 8080,
        host: 'localhost'
    });

    server.route(answer);

    await server.start();
    console.log(`Server is running on ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
