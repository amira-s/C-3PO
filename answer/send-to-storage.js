const { sendToQueue } = require('../broker');

function sendToStorage({ message, response = { output: {}} } = {}) {
  const data = {
    ...message,
    watson: [response],
    output: { type: "text", text: response.output.text },
  };

  sendToQueue('message-storage', JSON.stringify(data));
}

module.exports = sendToStorage;
