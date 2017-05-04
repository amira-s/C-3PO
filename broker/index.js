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

const channel = broker.then(conn => conn.createChannel());

const sendToQueue = (queueName, msg) => {
  return channel
    .then(ch => {
      ch.assertQueue(queueName, {
        durable: false, /* Delete queue on broker shutdown */
      });
      ch.sendToQueue(queueName, Buffer.from(msg));
      log('[broker] Sent to "message-storage" queue.')
    });
}

const consumeFromQueue = (queueName, callback) => {
  const consume = (msg) => {
    const str = msg.content.toString();
    let processed;
    try {
      processed = JSON.parse(str);
    } catch (e) {
      processed = str;
    }
    return callback(processed);
  }
  return channel
    .then(ch => ch.consume(queueName, consume, { noAck: true }));
};

module.exports = {
  connectToBroker,
  sendToQueue,
  consumeFromQueue,
};
