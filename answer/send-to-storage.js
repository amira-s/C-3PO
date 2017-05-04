const amqp = require('amqplib');
const log = require('../utils/log');
const delay = require('../utils/delay');

function connectToBroker(url, { retries = 20, retryInterval = 2e3 } = {}) {
  return amqp.connect(url)
    .then(a => {
      log('[send-to-storage] Connected to message broker.');
      return a;
    })
    .catch(err => {
      if (err.code === 'ECONNREFUSED') {
        err.cause = err.cause || {};
        console.error(`[send-to-storage] Can't connect to message broker at ` +
          `${err.cause.address}:${err.cause.port}. Is RabbitMQ started ? ` +
          (retries ? `(retrying in ${retryInterval}ms, retries: ${retries})` : ''));
        if (retries > 0) {
          return delay(retryInterval)
            .then(() => connectToBroker(url, { retries: retries - 1, retryInterval }));
        }
      } else {
        throw err;
      }
    })
}

const broker = connectToBroker('amqp://localhost');

function sendToStorage({ message, response = { output: {}} } = {}) {
  const data = {
    ...message,
    watson: [response],
    output: { type: "text", text: response.output.text },
  };

  broker
    .then(conn => conn.createChannel())
    .then(ch => ch.assertQueue('message-storage', {
      durable: false, /* Delete queue on broker shutdown */
    }));

  fetch('http://localhost:3001/api/v1/add-message',
    {
      method: 'POST',
      headers: {'Content-Type': "application/json"},
      body: JSON.stringify(data),
    })
    .then((res) => res.json())
    .then((json) => {
      log('[sendToStorage] /api/v1/add-message return:', json);
      return Promise.resolve(json);
    })
    .catch(err => {
      if (err.code === 'ECONNREFUSED') {
        log(`[sendToStorage] Can't connect to storage API. Is server started ?`,
          `"${err.message.replace(/^(.*), reason: /, '')}"`);
      } else {
        console.error('[sendToStorage] /api/v1/add-message failed:', err);
      }
    });
}

module.exports = sendToStorage;
