import { buildApp } from './app.js';
const PORT = 3001;
const app = await buildApp();
app.listen({ port: PORT, host: '0.0.0.0' })
    .then(() => {
    console.log(`API running on http://localhost:${PORT}`);
})
    .catch((err) => {
    app.log.error(err);
    process.exit(1);
});
