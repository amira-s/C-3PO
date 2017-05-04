module.exports = function delay(t) {
  return new Promise((resolve) => {
    global.setTimeout(resolve, t);
  });
}
