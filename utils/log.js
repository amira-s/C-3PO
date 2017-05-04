module.exports = process.env.DEBUG ?
  (...args) => console.log(...args) :
  () => {};
