


var prev = console;

var console = new Proxy({
  __on: {},
  addEventListener: function(name, callback) {
    this.__on[name] = (this.__on[name] || []).concat(callback);
    return this;
  },
  dispatchEvent: function(name, value) {
    this.__on[name] = (this.__on[name] || []);
    for (var i = 0, n = this.__on[name].length; i < n; i++) {
      this.__on[name][i].call(this, value);
    }
    return this;
  }
}, {
  get(t, p, r) {
    if (typeof prev[p] === 'function') {
      return function() {
        var a = [];
        // For V8 optimization
        for (var i = 0, n = arguments.length; i < n; i++) {
          a.push(arguments[i]);
        }
        t.dispatchEvent("console.", a);
        prev[p].apply(prev, arguments)
        const message = { type: 'LOGS', payload: a.map(item => JSON.stringify(item)) };
        window.parent.postMessage(message, 'https://qkhzuv56szcvez7lqt66swux4y0czctm.lambda-url.us-east-1.on.aws/'); // Parent's origin
      }
    } else {
      return prev[p]
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const message = {
    type: 'ERROR',
    payload: [JSON.stringify({
      lineNumber: event.reason.lineNumber,
      columnNumber: event.reason.columnNumber,
      stack: event.reason.stack,
      message: event.reason.message
    })]
  };
  window.parent.postMessage(message, 'https://qkhzuv56szcvez7lqt66swux4y0czctm.lambda-url.us-east-1.on.aws/');
})
