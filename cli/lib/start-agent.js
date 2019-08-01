'use strict';

const cluster = require('cluster');
const agentConfig = require('../../lib/agent-config');
const assert = require('assert');
const writeConsoleLog = require('microgateway-core').Logging.writeConsoleLog;

const CONSOLE_LOG_TAG_COMP = 'microgateway start agent';

var args;

process.argv.forEach((val /*, index, array */) => {
  args = val;
});

const argsJson = JSON.parse(args);
assert(argsJson);

agentConfig(argsJson, (e) => {
  if (e) {
    writeConsoleLog('error',{component: CONSOLE_LOG_TAG_COMP},'edge micro failed to start', e);
    return;
  }
  if (!cluster.isMaster) {
    if (process.send) process.send('online');
    process.on('message', (message) => {
      if (message === 'shutdown') {
        process.exit(0);
      }
    });
  } else {
    writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},'edge micro started');
  }
});