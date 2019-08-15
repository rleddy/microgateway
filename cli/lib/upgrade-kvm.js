"use strict";

const pem = require("pem");
const util = require("util");
//const debug = require("debug")("jwkrotatekey");
const request = require("request");
const writeConsoleLog = require('microgateway-core').Logging.writeConsoleLog;

const CONSOLE_LOG_TAG_COMP = 'microgateway upgrade kvm';

function generateCredentialsObject(options) {
    if (options.token) {
        return {
            "bearer": options.token
        };
    } else {
        return {
            user: options.username,
            pass: options.password
        };
    }
}

const UpgradeKVM = function () {

}

module.exports = function () {
  return new UpgradeKVM();
}

UpgradeKVM.prototype.upgradekvm = function upgradekvm(options, cb) {

    options.baseuri = options.mgmtUrl || "https://api.enterprise.apigee.com";
    options.kvm = 'microgateway';
    options.kid = '1';
    options.virtualhost = options.virtualhost || 'secure';    

    var publicKeyURI = util.format('https://%s-%s.apigee.net/edgemicro-auth/publicKey', options.org, options.env);

    writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},"Checking for certificate...");
    request({
        uri: publicKeyURI,
        auth: generateCredentialsObject(options),
        method: "GET"
    }, function(err, res, body) {
        if (err) {
            writeConsoleLog('error',{component: CONSOLE_LOG_TAG_COMP},err);
        } else {
            writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},"Certificate found!");
            pem.getPublicKey(body, function(err, publicKey) {
                writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},publicKey.publicKey);
                var updatekvmuri = util.format("%s/v1/organizations/%s/environments/%s/keyvaluemaps/%s",
                    options.baseuri, options.org, options.env, options.kvm);
                var payload = {
                    "name": options.kvm,
                    "encrypted": "true",
                    "entry": [
                        {
                            "name": "private_key_kid",
                            "value": options.kid
                        },
                        {
                            "name": "public_key1",
                            "value": publicKey.publicKey
                        },
                        {
                            "name": "public_key1_kid",
                            "value": options.kid
                        }
                    ]
                };          
                request({
                    uri: updatekvmuri,
                    auth: generateCredentialsObject(options),
                    method: "PUT",
                    json: payload
                }, function(err, res /*, body */) {
                    if (err) {
                        if ( cb ) { cb(err) } else process.exit(1);
                        return;
                    } if (res.statusCode !== 200) {
			            writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},"error upgrading KVM: " + res.statusCode);
                    } else {
                        writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},"KVM update complete");
                        process.exit(0);
                    }
                });
            });
        }
       }
    );

}

