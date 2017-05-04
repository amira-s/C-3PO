const watson = require('../watson-services');
const { consumeFromQueue } = require('../broker');
const log = require('../utils/log');
const Storage = require('./Storage.js');

module.exports = () => {
  consumeFromQueue('message-storage', function addMessage(msg) {
    console.log( '------------', 'time: [', new Date(), ']');

    if (typeof msg !== 'object') {
      console.error('ERROR [add-message] Malformed message received: ', msg);
    }

    log('[/api/v1/add-message] msg: ', msg);

    const messageId = msg.message_id;

    let content = {
      ...msg,
      id_session: "amira_s" + msg.id_session,
    };
    delete msg.message_id;

    watson.tone_analyzer(content.input.text, messageId)
      .then((response) => {
        console.log("natural language understanding added");
        console.log(JSON.stringify(response, null, 2));
        content.watson.push(response);
      })
      .catch((err) => {
        console.log("Tone analyzer ====== ", err);
      })
      .then(() => {
        return watson.nlu(content.input.text, messageId)
          .then((response) => {
            console.log("natural language understanding added");
            console.log(JSON.stringify(response, null, 2));
            content.watson.push(response);
          })
          .catch((err) => {
            console.log("NLU ====== ", err);
          });
      })
      .then(() => {
        watson.lastCall(messageId);
        new Storage("cloudantNoSQLDB", "codecamp", (db) => {
          db.insert(content, content.id_session, (err, data) => {});
        });
      });
  });
};
