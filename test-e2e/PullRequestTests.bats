#!/usr/bin/env bats

#
# Author: dkoroth@google.com
#

#set -x

load testhelper

# Username and Password for the api.enterprise.apigee.com
#MOCHA_USER=
#MOCHA_PASSWORD=

# OrgName configured at api.enterprise.apigee.com
#MOCHA_ORG=

# Proxy environment configured at api.enterprise.apigee.com
# Default is 'test' environment
#MOCHA_ENV=test

proxyNamePrefix="edgemicro_"
proxyTargetUrl="http://mocktarget.apigee.net/json"

EMG_CONFIG_DIR="$HOME/.edgemicro"
EMG_CONFIG_FILE="$HOME/.edgemicro/$MOCHA_ORG-$MOCHA_ENV-config.yaml"

PRODUCT_NAME="edgemicro_product_pr"
PROXY_NAME="edgemicro_proxy_pr"
DEVELOPER_NAME="edgemicro_dev_pr"
DEVELOPER_APP_NAME="edgemicro_dev_app_pr"

EDGEMICRO=$(which edgemicro || echo edgemicro)

TIMESTAMP=`date "+%Y-%m-%d-%H"`
LOGFILE="PullRequestTestLog.$TIMESTAMP"

setupOnce() {
  rm -f edgemicro.sock
  rm -f edgemicro.logs
  rm -f edgemicro.configure.txt
  rm -f verifyEMG.txt
  rm -rf $EMG_CONFIG_DIR
}

@test "installEMG" {

  logInfo "Install EMG"

  if [ -x "$(which edgemicro)" ]; then
    EDGEMICRO=$(which edgemicro)
    status=$? 
    logInfo "EMG is already installed. Skip installation step"
  else
    npm install -g edgemicro
    EDGEMICRO=$(which edgemicro)
    status=$? 
    logInfo "Install EMG with status $status"
  fi

  [ $status = 0 ]

}

@test "checkEMGVersion" {

  $EDGEMICRO --version > emgVersion.txt
  status=$?

  emgVersion=$(cat emgVersion.txt | grep 'current edgemicro version is' | cut -d ' ' -f5)
  nodejsVersion=$(cat emgVersion.txt | grep 'current nodejs version is' | cut -d ' ' -f5)
  rm -f emgVersion.txt

  logInfo "EMG version is $emgVersion and Nodejs version is $nodejsVersion"

  [ $status -eq 0 ]

}

@test "initEMG" {

  logInfo "Initialize EMG"

  mkdir -p $EMG_CONFIG_DIR

  $EDGEMICRO init 
  status=$?
  [ $status -eq 0 ]

  sleep 5

  logInfo "Initialize EMG with status $status"

  [ $status -eq 0 ]

}

@test "configureEMG" {

  logInfo "Configure EMG"

  $EDGEMICRO configure -o $MOCHA_ORG -e $MOCHA_ENV -u $MOCHA_USER -p $MOCHA_PASSWORD > edgemicro.configure.txt
  status=$?
  [ $status = 0 ]

  if [ ! -f $EMG_CONFIG_FILE ];
  then
     false
  fi

  sleep 5

  logInfo "Configure EMG with status $status"

  [ $status = 0 ]
}

@test "verifyEMG" {

  logInfo "Verifying EMG configuration"

  EMG_KEY=$(cat edgemicro.configure.txt | grep "key:" | cut -d ' ' -f4)
  EMG_SECRET=$(cat edgemicro.configure.txt | grep "secret:" | cut -d ' ' -f4)
  $EDGEMICRO verify -o $MOCHA_ORG -e $MOCHA_ENV -k $EMG_KEY -s $EMG_SECRET > verifyEMG.txt 2>&1
  status=$?
  [ $status = 0 ]

  sleep 5

  cat verifyEMG.txt | grep "verification complete"
  status=$?
  [ $status = 0 ]

  rm -f verifyEMG.txt

  logInfo "Verify EMG configuration with status $status"

  [ $status = 0 ]
}

@test "startEMG" {

  logInfo "Start EMG"

  EMG_KEY=$(cat edgemicro.configure.txt | grep "key:" | cut -d ' ' -f4)
  EMG_SECRET=$(cat edgemicro.configure.txt | grep "secret:" | cut -d ' ' -f4)
  $EDGEMICRO start -o $MOCHA_ORG -e $MOCHA_ENV -k $EMG_KEY -s $EMG_SECRET -p 1 > edgemicro.logs 2>&1 &
  status=$?
  [ $status = 0 ]

  sleep 5

  cat edgemicro.logs | grep "PROCESS PID"
  status=$?
  [ $status = 0 ]

  logInfo "Start EMG with status $status"

  [ $status = 0 ]
}

@test "configAndReloadEMG" {

  logInfo "Configure and Reload EMG"

  if [ ! -f $EMG_CONFIG_FILE ];
  then
     false
  fi

  yq w -i ${EMG_CONFIG_FILE} edgemicro.config_change_poll_interval 10
  yq w -i ${EMG_CONFIG_FILE} oauth.allowNoAuthorization false
  yq w -i ${EMG_CONFIG_FILE} edgemicro.plugins.sequence[1] quota

  EMG_KEY=$(cat edgemicro.configure.txt | grep "key:" | cut -d ' ' -f4)
  EMG_SECRET=$(cat edgemicro.configure.txt | grep "secret:" | cut -d ' ' -f4)
  $EDGEMICRO reload -o $MOCHA_ORG -e $MOCHA_ENV -k $EMG_KEY -s $EMG_SECRET 
  status=$?
  [ $status = 0 ]

  sleep 10

  logInfo "Configure and reload EMG with status $status"

  [ $status = 0 ]
}

@test "setProductNameFilter" {

  logInfo "SetProductName Filter"

  yq w -i ${EMG_CONFIG_FILE} edge_config.products "https://${MOCHA_ORG}-${MOCHA_ENV}.apigee.net/edgemicro-auth/products?productnamefilter=.*$PRODUCT_NAME.*"
  EMG_KEY=$(cat edgemicro.configure.txt | grep "key:" | cut -d ' ' -f4)
  EMG_SECRET=$(cat edgemicro.configure.txt | grep "secret:" | cut -d ' ' -f4)
  $EDGEMICRO reload -o $MOCHA_ORG -e $MOCHA_ENV -k $EMG_KEY -s $EMG_SECRET 
  status=$?
  sleep 15

  logInfo "SetProductName Filter with status $status"

  [ $status = 0 ]
}

@test "testAPIProxy" {

  logInfo "Test API Proxy"

  apiKey=$(getDeveloperApiKey ${DEVELOPER_NAME} ${DEVELOPER_APP_NAME})
  curl -q -s http://localhost:8000/v1/${PROXY_NAME} -H "x-api-key: $apiKey" -D headers.txt 
  status=$(grep HTTP headers.txt | cut -d ' ' -f2)
  rm -f headers.txt

  logInfo "Test API Proxy with status $status"

  [ $status = 200 ]
}

@test "testQuota" {

  logInfo "Test Quota"

  apiKey=$(getDeveloperApiKey ${DEVELOPER_NAME} ${DEVELOPER_APP_NAME})
  curl -q -s http://localhost:8000/v1/${PROXY_NAME} -H "x-api-key: $apiKey" -D headers.txt 
  curl -q -s http://localhost:8000/v1/${PROXY_NAME} -H "x-api-key: $apiKey" -D headers.txt 
  curl -q -s http://localhost:8000/v1/${PROXY_NAME} -H "x-api-key: $apiKey" -D headers.txt 
  status=$(grep HTTP headers.txt | cut -d ' ' -f2)

  rm -f headers.txt

  logInfo "Test quota with status $status"

  [ $status = 403 ]
}

@test "testInvalidAPIKey" {

  logInfo "Test Invalid API Key"

  apiKey="API KEY INVALID TO BE BLOCKED"
  curl -q -s http://localhost:8000/v1/${PROXY_NAME} -H "x-api-key: $apiKey" -D headers.txt 
  status=$(grep HTTP headers.txt | cut -d ' ' -f2)
  rm -f headers.txt

  logInfo "Test Invalid API Key with status $status"

  [ $status = 403 ]
}

@test "testRevokedAPIKey" {

  logInfo "Test Revoked API Key"

  apiKey="2UKv8QSMmi5ehtqDShRQPvXBAqEWqPIS"
  curl -q -s http://localhost:8000/v1/${PROXY_NAME} -H "x-api-key: $apiKey" -D headers.txt 
  status=$(grep HTTP headers.txt | cut -d ' ' -f2)
  rm -f headers.txt

  logInfo "Test revoked API Key with status $status"

  [ $status = 403 ]
}

@test "testInvalidJWT" {

  logInfo "Test Invalid JWT"

  apiJWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  curl -q -s http://localhost:8000/v1/${PROXY_NAME} -H "Authorization: Bearer $apiJWT" -D headers.txt 
  status=$(grep HTTP headers.txt | cut -d ' ' -f2)
  rm -f headers.txt

  logInfo "Test Invalid JWT with status $status"

  [ $status = 401 ]
}

@test "testExpiredJWT" {

  logInfo "Test Expired JWT"

  apiJWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  curl -q -s http://localhost:8000/v1/${PROXY_NAME} -H "Authorization: Bearer $apiJWT" -D headers.txt 
  status=$(grep HTTP headers.txt | cut -d ' ' -f2)
  rm -f headers.txt

  logInfo "Test Expired JWT with status $status"

  [ $status = 401 ]
}

@test "setInvalidProductNameFilter" {

  logInfo "Set Invalid Product Name Filter"

  yq w -i ${EMG_CONFIG_FILE} edge_config.products "https://${MOCHA_ORG}-${MOCHA_ENV}.apigee.net/edgemicro-auth/products?productnamefilter=*$PRODUCT_NAME*"
  EMG_KEY=$(cat edgemicro.configure.txt | grep "key:" | cut -d ' ' -f4)
  EMG_SECRET=$(cat edgemicro.configure.txt | grep "secret:" | cut -d ' ' -f4)
  $EDGEMICRO reload -o $MOCHA_ORG -e $MOCHA_ENV -k $EMG_KEY -s $EMG_SECRET 
  status=$?
  sleep 15

  logInfo "Set Invalid Product Name Filter with status $status"

  [ $status = 0 ]
}

@test "testInvalidProductNameFilter" {

  logInfo "Test Invalid Product Name Filter"

  apiKey=$(getDeveloperApiKey ${DEVELOPER_NAME} ${DEVELOPER_APP_NAME})
  curl -q -s http://localhost:8000/v1/${PROXY_NAME} -H "x-api-key: $apiKey" -D headers.txt 
  status=$(grep HTTP headers.txt | cut -d ' ' -f2)
  rm -f headers.txt

  logInfo "Test Invalid Product Name Filter with status $status"

  [ $status = 200 ]
}

@test "resetInvalidProductNameFilter" {

  logInfo "Reset Invalid Product Name Filter"

  yq w -i ${EMG_CONFIG_FILE} edge_config.products "https://${MOCHA_ORG}-${MOCHA_ENV}.apigee.net/edgemicro-auth/products"
  EMG_KEY=$(cat edgemicro.configure.txt | grep "key:" | cut -d ' ' -f4)
  EMG_SECRET=$(cat edgemicro.configure.txt | grep "secret:" | cut -d ' ' -f4)
  $EDGEMICRO reload -o $MOCHA_ORG -e $MOCHA_ENV -k $EMG_KEY -s $EMG_SECRET 
  status=$?
  sleep 15

  logInfo "Reset Invalid Product Name Filter with status $status"

  [ $status = 0 ]
}

@test "stopEMG" {

  logInfo "Stop EMG"

  $EDGEMICRO stop 
  sleep 10
  killall node
  status=$?

  logInfo "stopped EMG with status $status"

  [ $status = 0 ]
}

@test "uninstallEMG" {

  logInfo "Uninstall EMG"

  npm uninstall -g edgemicro
  rm -f edgemicro.sock
  rm -f edgemicro.configure.txt
  rm -f headers.txt
  rm -rf $EMG_CONFIG_DIR
  status=$? 

  logInfo "Uninstall EMG with status $status"

  [ $status = 0 ]
}

