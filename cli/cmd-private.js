'use strict';

var app = require('commander');
var privateOperations = require('./lib/private')();
//const debug = require('debug')('configure');
const upgradekvm = require('./lib/upgrade-kvm')();
const upgradeauth = require('./lib/upgrade-edgeauth')();
const rotatekey = require('./lib/rotate-key')();
const writeConsoleLog = require('microgateway-core').Logging.writeConsoleLog;
const cert = require('./lib/cert')();

const CONSOLE_LOG_TAG_COMP = 'microgateway cmd private';

var prompt = require('cli-prompt');


function authorize(options) {
    //if token is not passed, username is mandatory
    if (!options.token) {
        //If there is no token then we can go through the password process
        if (!options.username) {
            return options.error('username is required');
        }
        if (!options.password) {
            promptForPassword(options, (options) => {
                if (!options.password) {
                    return options.error('password is required');
                }
            });
        }
    }
    return(true)
}


module.exports = function() {
    //
    app
    .command('cert-install')
    .option('-o, --org <org>', 'the organization')
    .option('-e, --env <env>', 'the environment')
    .option('-t, --token <token>', 'OAuth token to use with management API')
    .option('-u, --username <user>', 'username of the organization admin')
    .option('-p, --password <password>', 'password of the organization admin')
    .option('-f, --force', 'replace any existing keys')
    .option('-m, --mgmt-url <mgmtUrl>', 'the URL of the management server')
    .description('install a certificate for your organization')
    .action((options) => {
      options.error = optionError;
      options.token = options.token || process.env.EDGEMICRO_SAML_TOKEN;
      if (!options.mgmtUrl) {
                return options.error('mgmtUrl is required');
            }
      if (options.token) {
        if (!options.org) { return options.error('org is required'); }
        if (!options.env) { return options.error('env is required'); }
        cert.installCert(options);
      } else {
        if (!options.username) { return  options.error('username is required'); }
        if (!options.org) { return  options.error('org is required'); }
        if (!options.env) { return  options.error('env is required'); }
        promptForPassword(options,(options)=>{
          if (!options.password) { return  options.error('password is required'); }
          cert.installCert(options)
        });
      }
    });

    //
    app
        .command('configure')
        .description('Automated, one-time setup of edgemicro with Apigee Private Cloud')
        .option('-o, --org <org>', 'the organization')
        .option('-r, --runtime-url <runtimeUrl>', 'the URL of the runtime server')
        .option('-m, --mgmt-url <mgmtUrl>', 'the URL of the management server')
        .option('-e, --env <env>', 'the environment')
        .option('-u, --username <user>', 'username of the organization admin')
        .option('-p, --password <password>', 'password of the organization admin')
        .option('-v, --virtual-hosts <virtualHosts>', 'comma separated virtual hosts to deploy with')
        .option('-c, --configDir <configDir>', 'Set the directory where configs are read from.')
        .option('-t, --token <token>', 'OAuth token to use with management API')
        .option('-k  --key <key>', 'Path to private key to be used by Apigee Edge')
        .option('-s  --cert <cert>', 'Path to certificate to be used by Apigee Edge')
        .option('-d, --debug', 'execute with debug output')

        .action((options) => {
            options.error = optionError(options);
            options.token = options.token || process.env.EDGEMICRO_SAML_TOKEN;
            options.configDir = options.configDir || process.env.EDGEMICRO_CONFIG_DIR;

            if (!options.org) {
                return options.error('org is required');
            }

            if (!options.env) {
                return options.error('env is required');
            }

            if ( !((options.key !== undefined) && (options.cert !== undefined)) ) {
                return options.error('key and cert must be passed together');
            }
            //
            if (!options.runtimeUrl) {
                return options.error('runtimeUrl is required');
            }

            if (!options.runtimeUrl.includes('http') || !options.mgmtUrl.includes('http') ) {
                return options.error('runtimeUrl requires a prototcol http or https');
            }

            var auth = authorize(options)
            if ( auth ) {
                privateOperations.configureEdgemicro(options);
            } else {
                return auth
            }

        });

    app
        .command('upgradekvm')
        .option('-o, --org <org>', 'the organization')
        .option('-e, --env <env>', 'the environment')
        .option('-u, --username <user>', 'username of the organization admin')
        .option('-p, --password <password>', 'password of the organization admin')
        .option('-v, --virtualhost <virtualhost>', 'virtual host of the proxy')
        .option('-m, --mgmt-url <mgmtUrl>', 'the URL of the management server')
        .option('-t, --token <token>', 'OAuth token to use with management API')
        .description('upgrade kvm to support JWT Key rotation')
        .action((options) => {
            options.error = optionError(options);
            options.token = options.token || process.env.EDGEMICRO_SAML_TOKEN;

            if (!options.token) {
                if (!options.username) {
                    return options.error('username is required');
                }

                promptForPassword(options, (options) => {
                    if (!options.password) {
                        return options.error('password is required');
                    }
                });
            }

            if (!options.org) {
                return options.error('org is required');
            }
            if (!options.env) {
                return options.error('env is required');
            }
            if (!options.runtimeUrl) {
                return options.error('runtimeUrl is required');
            }
            if (!options.mgmtUrl) {
                return options.error('mgmtUrl is required');
            }
            if (!options.mgmtUrl.includes('http')) {
                return options.error('runtimeUrl requires a prototcol http or https')
            }

            upgradekvm.upgradekvm(options, () => {});

        });

    app
        .command('upgradeauth')
        .option('-o, --org <org>', 'the organization')
        .option('-e, --env <env>', 'the environment')
        .option('-u, --username <user>', 'username of the organization admin')
        .option('-p, --password <password>', 'password of the organization admin')
        .option('-v, --virtualhost <virtualhost>', 'virtual host of the proxy')
        .option('-m, --mgmt-url <mgmtUrl>', 'the URL of the management server')
        .option('-t, --token <token>', 'OAuth token to use with management API')
        .description('upgrade edgemicro-auth proxy')
        .action((options) => {
            options.error = optionError(options);
            options.token = options.token || process.env.EDGEMICRO_SAML_TOKEN;
            
            if (!options.token) {
                if (!options.username) {
                    return options.error('username is required');
                }

                promptForPassword(options, (options) => {
                    if (!options.password) {
                        return options.error('password is required');
                    }
                });
            }
            if (!options.org) {
                return options.error('org is required');
            }
            if (!options.env) {
                return options.error('env is required');
            }
            if (!options.mgmtUrl) {
                return options.error('mgmtUrl is required');
            }
            if (!options.mgmtUrl.includes('http')) {
                return options.error('runtimeUrl requires a prototcol http or https')
            }

            upgradeauth.upgradeauth(options, () => {});

        });

    app
        .command('rotatekey')
        .option('-o, --org <org>', 'the organization')
        .option('-e, --env <env>', 'the environment')
        .option('-u, --username <user>', 'username of the organization admin')
        .option('-p, --password <password>', 'password of the organization admin')
        .option('-k, --kid <kid>', 'new key identifier')
        .option('-m, --mgmt-url <mgmtUrl>', 'the URL of the management server')
        .option('-t, --token <token>', 'OAuth token to use with management API')
        .description('Rotate JWT Keys')
        .action((options) => {
            options.error = optionError(options);
            options.token = options.token || process.env.EDGEMICRO_SAML_TOKEN;

            if (!options.token) {
                if (!options.username) {
                    return options.error('username is required');
                }

                promptForPassword(options, (options) => {
                    if (!options.password) {
                        return options.error('password is required');
                    }
                });
            }
            if (!options.org) {
                return options.error('org is required');
            }
            if (!options.env) {
                return options.error('env is required');
            }
            if (!options.mgmtUrl) {
                return options.error('mgmtUrl is required');
            }
            if (!options.mgmtUrl.includes('http')) {
                return options.error('runtimeUrl requires a prototcol http or https')
            }

            rotatekey.rotatekey(options, () => {});
            
        });

    app.parse(process.argv);

    var running = false;
    app.commands.forEach(function(command) {
        if (command._name === app.rawArgs[2]) {
            running = true;
        }
    });
    if (!running) {
        app.help();
    }
}
// prompt for a password if it is not specified
function promptForPassword(options, cb) {

    if (options.password) {
        cb(options);
    } else {
        prompt.password("password:", function(pw) {
            options.password = pw;
            cb(options);
        });
    }
}

function optionError(caller) {
    return(((obj) => { 
      return((message) => {
        writeConsoleLog('error',{component: CONSOLE_LOG_TAG_COMP},message);
        obj.help();  
      });
     })(caller))
}
  
