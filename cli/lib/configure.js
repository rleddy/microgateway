'use strict';

const edgeconfig = require('microgateway-config')
//const prompt = require('cli-prompt');
//const path = require('path');
//const apigeetool = require('apigeetool');
//const _ = require('lodash');
const async = require('async')
const util = require('util')
const fs = require('fs')
const assert = require('assert');
const writeConsoleLog = require('microgateway-core').Logging.writeConsoleLog;
edgeconfig.setConsoleLogger(writeConsoleLog);
const configLocations = require('../../config/locations');
const BUFFERSIZE    = 10000;
const BATCHSIZE     = 500;
const FLUSHINTERVAL = 5000;
const CONSOLE_LOG_TAG_COMP = 'microgateway configure';


// 
var certLib = require('./cert-lib')
var cert;
var deployAuthLib = require('./deploy-auth')
var deployAuth;
var defaultConfig ;
var authUri, managementUri, keySecretMessage, targetFile;

const Configure = function () {

}

module.exports = function () {
  return new Configure();
}


function initializationCallback(options,dAuth,cb) {
    options.deployed = false;
    dAuth.checkDeployedProxies(options, (err, options) => {
      if (err) {
        writeConsoleLog('error',{component: CONSOLE_LOG_TAG_COMP}, err);
        if ( cb ) { cb(err) } else process.exit(1);
        return;
      }
      configureEdgemicroWithCreds(options, (err) => {
        if (err) {
          writeConsoleLog('error',{component: CONSOLE_LOG_TAG_COMP}, err);
          if ( cb ) { cb(err) } else process.exit(1);
        }
        if ( cb ) { cb(err) } else process.exit(0);
      });
    })
}


function unloadConfigLocation(options) {

  targetFile = configLocations.getSourceFile(options.org, options.env);
  const cache = configLocations.getCachePath(options.org, options.env);
  if (fs.existsSync(cache)) {
    fs.unlinkSync(cache);
  }

  const targetPath = configLocations.getSourcePath(options.org, options.env);
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }

}


function setDefaults(options) {

  defaultConfig = edgeconfig.load({ source: configLocations.getDefaultPath(options.configDir) });
  addEnvVars(defaultConfig);
  deployAuth = deployAuthLib(defaultConfig.edge_config, null)
  managementUri = defaultConfig.edge_config.managementUri;
  keySecretMessage = defaultConfig.edge_config.keySecretMessage;

  if(!options.token) {
    assert(options.username, 'username is required');
    assert(options.password, 'password is required');
  }
  assert(options.org, 'org is required');
  assert(options.env, 'env is required');

  if(!options.proxyName) {
    options.proxyName = 'edgemicro-auth';
  }

  if (options.url) {
    if (options.url.indexOf('://') === -1) {
      options.url = 'https://' + options.url;
    }
    defaultConfig.edge_config.authUri = options.url + '/' + options.proxyName;
  } else {
    var newAuthURI = util.format(defaultConfig.edge_config.authUri, options.org, options.env);
    defaultConfig.edge_config.authUri = newAuthURI;
  }

  authUri = defaultConfig.edge_config.authUri;
}


// ---- ---- ---- ---- ---- ---- ---- ---- ----
Configure.prototype.configure = function configure(options, cb) {
  //
  if (!fs.existsSync(configLocations.getDefaultPath(options.configDir))) {
    writeConsoleLog('error',{component: CONSOLE_LOG_TAG_COMP},"Missing %s, Please run 'edgemicro init'",configLocations.getDefaultPath())
    return cb("Please call edgemicro init first")
  }
  //
  setDefaults(options)
  cert = certLib(defaultConfig)
  unloadConfigLocation(options)
  //
  var configFileDirectory = options.configDir || configLocations.homeDir;
  //writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'init config');
  edgeconfig.init({
    source: configLocations.getDefaultPath(options.configDir),
    targetDir: configFileDirectory,
    targetFile: targetFile,
    overwrite: true
  }, () => { initializationCallback(options,deployAuth,cb) } );

};


function setAndlogSecrets(options,results) {

  if (options.deployed === true) {
    writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'vault info:\n', results[0]);
  } else {
    writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'vault info:\n', results[1]);
  }
  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP});

  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},keySecretMessage);
  const key = results[2] ? results[2].key : results[1].key;
  const secret = results[2] ? results[2].secret : results[1].secret;
  assert(key, 'must have a key');
  assert(secret, 'must have a secret');
  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, '  key:', key);
  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, '  secret:', secret);
  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP});
  process.env.EDGEMICRO_KEY = key;
  process.env.EDGEMICRO_SECRET = secret;
}


function setAndLogAgentConfig(options,results,agentConfig,agentConfigPath) {

  if (options.deployed === false) {  
    agentConfig['edge_config']['jwt_public_key'] = (options.url ? options.url+"/edgemicro-auth/publicKey" : results[0]); // get deploy results
    agentConfig['edge_config'].bootstrap = results[2].bootstrap; // get genkeys results
  } else {
    agentConfig['edge_config']['jwt_public_key'] = authUri + '/publicKey';
    agentConfig['edge_config'].bootstrap = results[1].bootstrap;
  }

  var publicKeyUri = agentConfig['edge_config']['jwt_public_key'];
  if (publicKeyUri) {
    agentConfig['edge_config']['products'] = publicKeyUri.replace('publicKey', 'products');

    if (!agentConfig.hasOwnProperty('oauth') || agentConfig['oauth'] === null) {
      agentConfig['oauth'] = {};
    }
    agentConfig['oauth']['verify_api_key_url'] = publicKeyUri.replace('publicKey', 'verifyApiKey');
  }

  var bootstrapUri = agentConfig['edge_config']['bootstrap'];
  if (bootstrapUri) {
    if (!agentConfig.hasOwnProperty('analytics') || agentConfig['analytics'] === null) {
      agentConfig['analytics'] = {};
    }

    agentConfig['analytics']['uri'] = bootstrapUri.replace('bootstrap', 'axpublisher');
    agentConfig['analytics']['bufferSize']    = BUFFERSIZE;
    agentConfig['analytics']['batchSize']     = BATCHSIZE;
    agentConfig['analytics']['flushInterval'] = FLUSHINTERVAL;
  }

  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP});
  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'saving configuration information to:', agentConfigPath);
  edgeconfig.save(agentConfig, agentConfigPath); // if it didn't throw, save succeeded
  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP});

}


function configSeriesCallBack(results, agentConfigPath, options, cb) {

  const agentConfig = edgeconfig.load({ source: agentConfigPath });
  addEnvVars(agentConfig);
  setAndLogAgentConfig(options,results,agentConfig,agentConfigPath)
  setAndlogSecrets(options,results)
  // ---
  writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'edgemicro configuration complete!');
  // ---
  setTimeout(cb, 50)

}


function configureEdgemicroWithCreds(options, cb) {
  var tasks = [];

  var agentConfigPath = configLocations.getSourcePath(options.org, options.env, options.configDir);
	
  if (options.deployed === false) {
    tasks.push(function (callback) {
      deployAuth.deployWithLeanPayload(options, callback);
    });
  } 

  tasks.push(
    function (callback) {
      setTimeout(() => {
  	      writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'checking org for existing KVM');
          cert.checkCertWithPassword(options, function (err/*, certs */) {
          if (err) {
            writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'error checking for cert. Installing new cert.');
            cert.installCertWithPassword(options, callback);
          } else {
            writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'KVM already exists in your org');
            cert.retrievePublicKey(options, callback);
          }
        });
      }, 250)
    }
  );

  tasks.push(
    function (callback) {
      cert.generateKeysWithPassword(options, callback);
    }
  );

  async.series(tasks, function (err, results) {
    if (err) {
      return cb(err);
    }
    //
    assert(targetFile, 'must have an assigned target file')
    //
    configSeriesCallBack(results, agentConfigPath, options, cb)
  });
}

function addEnvVars(config) {
  config.edge_config.managementUri = process.env.MGMT_URI || config.edge_config.managementUri;
  config.edge_config.authUri = process.env.AUTH_URI || config.edge_config.authUri;
  config.edge_config.baseUri = process.env.BASE_URI || config.edge_config.baseUri;
}
/*
function printError(err) {
  if (err.response) {
    writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},err.response.error);
  } else {
    writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},err);
  }
}
*/
