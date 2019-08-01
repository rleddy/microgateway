'use strict';

var forever = require('forever-monitor');
const writeConsoleLog = require('microgateway-core').Logging.writeConsoleLog;

const CONSOLE_LOG_TAG_COMP = 'microgateway forever';

try { 
  var foreverOptions = require('./forever.json');
} catch (err) {
  writeConsoleLog('error',{component: CONSOLE_LOG_TAG_COMP},err);
  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},"using default forever options");
  var foreverOptions =  { max: 3, silent: false, killTree: true, minUptime: 2000 };
}

var child = new (forever.Monitor)('./app.js', foreverOptions); 

child.start();
