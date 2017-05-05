const fetch = require('node-fetch');

const STORAGE_API_URL = 'http://localhost:3001/api/v1/add-message';

function sendToStorage({ message, response = { output: {}} } = {}) {
  const data = {
    ...message,
    watson: [response],
    output: { type: "text", text: response.output.text },
  };

  fetch(STORAGE_API_URL, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

module.exports = sendToStorage;
