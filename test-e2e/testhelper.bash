#
# Author: dkoroth@google.com
#

proxyBundleVersion="1"

API_PRODUCT_URL="https://api.enterprise.apigee.com/v1/o"
API_PROXY_URL="https://api.enterprise.apigee.com/v1/organizations"

CURL="curl -q -s"

logError(){
    echo -e "[ERROR]: $*" >> $LOGFILE
    exit 1
}

logInfo(){
    echo -e "[INFO]: $*" >> $LOGFILE
}

#
#
# Developer APIs 
# 
#

listDevelopers() {

    local result=0

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/developers" 
    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -D headers.txt -o listDevelopers.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve developer lists with code $result"
    rm -f listDevelopers.txt
    rm -f headers.txt

    logInfo "Successfully retrieved developer list with code $result"

    return $result

}

createDeveloper() {

    local result=0
    apiDeveloper="$1"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/developers" 

    cat templates/apideveloper-template.json | jq --arg developer ${apiDeveloper} '(.email) = $developer + "@google.com" | (.firstName, .userName) = $developer | (.lastName) = "dev"' > "${apiDeveloper}".json
    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -X POST -d @"${apiDeveloper}".json -D headers.txt -o createDeveloper.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to create developer with code $result"
    rm -f "${apiDeveloper}".json
    rm -f createDeveloper.txt
    rm -f headers.txt

    logInfo "Successfully created developer with code $result"

    return $result
}

listDeveloper() {

    local result=0
    apiDeveloper="$1"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/developers/${apiDeveloper}@google.com"
    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -D headers.txt -o listDeveloper.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve developer list with code $result"
    rm -f listDeveloper.txt
    rm -f headers.txt

    logInfo "Successfully created developer with code $result"

    return $result

}

deleteDeveloper() {

    local result=0
    apiDeveloper="$1"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/developers/${apiDeveloper}@google.com"
    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" -X DELETE ${apiProxyURL} -D headers.txt -o deleteDeveloper.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to delete developer with code $result"
    rm -f deleteDeveloper.txt
    rm -f headers.txt

    logInfo "Successfully deleted developer with code $result"

    return $result

}

#
#
# Developer Apps APIs 
# 
#

listDeveloperApps() {

    local result=0
    apiDeveloper="$1"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/developers/${apiDeveloper}@google.com/apps"
    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -D headers.txt -o listDeveloperApps.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve developer apps list with code $result"
    rm -f listDeveloperApps.txt
    rm -f headers.txt
    logInfo "Successfully retrieved developer app list with code $result"

    return $result

}

createDeveloperApp() {

    local result=0
    apiDeveloper="$1"
    apiDeveloperApp="$2"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/developers/${apiDeveloper}@google.com/apps" 

    cat ${apiDeveloperApp}.json | jq --arg developerName ${apiDeveloperApp} '(.name,.attributes[0].value) = $developerName' > "${apiDeveloperApp}".json.tmp
    mv "${apiDeveloperApp}".json.tmp "${apiDeveloperApp}".json

    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -X POST -d @${apiDeveloperApp}.json -D headers.txt -o createDeveloperApp.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to create developer app with code $result"
    rm -f createDeveloperApp.txt
    rm -f headers.txt

    logInfo "Successfully created developer app with code $result"

    return $result
}


listDeveloperApp() {

    local result=0
    apiDeveloper="$1"
    apiDeveloperApp="$2"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/developers/${apiDeveloper}@google.com/apps/${apiDeveloperApp}"
    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -D headers.txt -o listDeveloperApp.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve developer app with code $result"
    rm -f listDeveloperApp.txt
    rm -f headers.txt

    logInfo "Successfully retrieved developer app with code $result"

    return $result

}

getDeveloperApiKey() {

    apiKey=" "
    apiDeveloper="$1"
    apiDeveloperApp="$2"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/developers/${apiDeveloper}@google.com/apps/${apiDeveloperApp}"
    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -D headers.txt -o getDeveloperApiKey.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve developer api key with code $result"
    if [ $result -eq 200 ]; then
         apiKey=$(cat getDeveloperApiKey.txt | jq -r .credentials[0].consumerKey)
    fi
    rm -f getDeveloperApiKey.txt
    rm -f headers.txt

    logInfo "Successfully retrieved developer api key with code $result"

    echo "$apiKey"

}

deleteDeveloperApp() {

    local result=0
    apiDeveloper="$1"
    apiDeveloperApp="$2"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/developers/${apiDeveloper}@google.com/apps/${apiDeveloperApp}"
    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" -X DELETE ${apiProxyURL} -D headers.txt -o deleteDeveloperApp.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to delete developer app with code $result"
    rm -f deleteDeveloperApp.txt
    rm -f headers.txt

    logInfo "Successfully delete developer app with code $result"

    return $result

}

#
#
# API Proxy APIs
# 
#

listAPIProxy() {

    local result=0
    apiProxyName="$1"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/apis/${apiProxyName}"
    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -D headers.txt -o listAPIProxy.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve API Proxy list with code $result"
    rm -f listAPIProxy.txt
    rm -f headers.txt

    logInfo "Successfully retrieve API Proxy list with code $result"

    return $result

}


listAPIProxies() {

    local result=0
    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/apis" 

    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -D headers.txt -o listAPIProxies.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve API Proxies list with code $result"
    rm -f listAPIProxies.txt

    logInfo "Successfully retrieve API Proxies list with code $result"

    return $result

}

createAPIProxy() {

    local result=0
    apiProxyName="$1"
    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/apis" 

    cat templates/apiproxy-template.json | jq --arg apiProxyName ${apiProxyName} '(.name) = $apiProxyName' > "${apiProxyName}".json

    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -X POST -d @"${apiProxyName}".json -D headers.txt -o createAPIProxy.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to create API Proxy with code $result"
    rm -f "${apiProxyName}".json 
    rm -f createAPIProxy.txt
    rm -f headers.txt

    logInfo "Successfully created API Proxy with code $result"

    return $result

}


listAPIProxy() {

    local result=0
    apiProxyName="$1"
    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/apis/${apiProxyName}"

    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -D headers.txt -o listAPIProxy.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve API Proxy list with code $result"
    rm -f listAPIProxy.txt
    rm -f headers.txt

    logInfo "Successfully retrieve API Proxy list with code $result"

    return $result

}

updateAPIProxy() {

    local result=0
    apiProxyName="$1"
    apiProxyBundle="$2"
    apiProxyBundleRevision="$3"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/apis/${apiProxyName}/revisions/${apiProxyBundleRevision}" 

    ${CURL} -H "Content-Type: multipart/form-data" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -X POST -F "file=@${apiProxyBundle}" -D headers.txt -o updateAPIProxy.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | grep -v 100 | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to update API Proxy with code $result"
    rm -f updateAPIProxy.txt
    rm -f headers.txt

    logInfo "Successfully updated API Proxy with code $result"

    return $result

}

deployAPIProxy() {

    local result=0
    apiProxyName="$1"
    envName="$2"
    apiProxyBundleRevision="$3"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/environments/${envName}/apis/${apiProxyName}/revisions/${apiProxyBundleRevision}/deployments" 

    ${CURL} -H "Content-Type: application/x-www-form-urlencoded" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -X POST -D headers.txt -o deployAPIProxy.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to deploy API Proxy with code $result"
    rm -f deployAPIProxy.txt
    rm -f headers.txt
    logInfo "Successfully deployed API Proxy with code $result"

    return $result

}

undeployAPIProxy() {

    local result=0
    apiProxyName="$1"
    envName="$2"
    apiProxyBundleRevision="$3"

    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/environments/${envName}/apis/${apiProxyName}/revisions/${apiProxyBundleRevision}/deployments" 

    ${CURL} -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -X DELETE -D headers.txt -o undeployAPIProxy.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to undeploy API Proxy with code $result"
    rm -f undeployAPIProxy.txt
    rm -f headers.txt

    logInfo "Successfully undeployed API Proxy with code $result"

    return $result

}

deleteAPIProxy() {

    local result=0
    apiProxyName="$1"
    apiProxyURL="${API_PROXY_URL}/${MOCHA_ORG}/apis/${apiProxyName}"

    ${CURL} -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${apiProxyURL} -X DELETE -D headers.txt -o deleteAPIProxy.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to delete API Proxy with code $result"
    rm -f deleteAPIProxy.txt
    rm -f headers.txt

    logInfo "Successfully deleted API Proxy with code $result"

    return $result

}

createAPIProxyBundle() {

    apiProxyName="$1"
    proxyPrefix="edgemicro_proxy"

    mkdir -p apiproxy
    cp -rf templates/apiproxy_template/* apiproxy/
    mv apiproxy/$proxyPrefix.xml apiproxy/$apiProxyName.temp.xml
    mv apiproxy/proxies/default.xml apiproxy/proxies/default.temp.xml
    mv apiproxy/targets/default.xml apiproxy/targets/default.temp.xml
    sed "s,${proxyPrefix},${apiProxyName},g" apiproxy/$apiProxyName.temp.xml > apiproxy/$apiProxyName.xml
    sed "s,${proxyPrefix},${apiProxyName},g" apiproxy/proxies/default.temp.xml > apiproxy/proxies/default.xml
    sed "s,TARGET_URL,${proxyTargetUrl},g" apiproxy/targets/default.temp.xml > apiproxy/targets/default.xml
    rm -f apiproxy/$apiProxyName.temp.xml
    rm -f apiproxy/proxies/default.temp.xml
    rm -f apiproxy/targets/default.temp.xml
    zip -q -r ${apiProxyName}.zip apiproxy/
    rm -rf apiproxy/

    echo "${apiProxyName}.zip"

}

#
#
# Product APIs
# 
#

listAPIProducts() {

    local result=0
    productURL="${API_PRODUCT_URL}/${MOCHA_ORG}/apiproducts"
    ${CURL} -q -s -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${productURL} -D headers.txt -o listAPIProducts.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve API Products list with code $result"
    rm -f listAPIProducts.txt
    rm -f headers.txt

    logInfo "Successfully retrieved API Products list with code $result"

    return $result

}

createAPIProduct() {

    local result=0
    apiProductName="$1"

    productURL="${API_PRODUCT_URL}/${MOCHA_ORG}/apiproducts"

    cat ${apiProductName}.json | jq --arg productName ${apiProductName} '(.name, .displayName) = $productName| (.description) += $productName' > "${apiProductName}".json.tmp
    mv "${apiProductName}".json.tmp "${apiProductName}".json

    ${CURL} -q -s -H "Content-Type:application/json" -X POST -d @"${apiProductName}".json -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${productURL} -D headers.txt -o createAPIProduct.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to create API Product with code $result"
    rm -f createAPIProduct.txt
    rm -f headers.txt

    logInfo "Successfully created API Product with code $result"

    return $result

}

listAPIProduct() {

    local result=0
    apiProductName="$1"

    productURL="${API_PRODUCT_URL}/${MOCHA_ORG}/apiproducts/${apiProductName}"
    ${CURL} -q -s -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${productURL} -D headers.txt -o listAPIProduct.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to retrieve API Product list with code $result"
    rm -f listAPIProduct.txt
    rm -f headers.txt

    logInfo "Successfully retrieved API Product list with code $result"

    return $result
}

deleteAPIProduct() {

    local result=0
    apiProductName="$1"
    productURL="${API_PRODUCT_URL}/${MOCHA_ORG}/apiproducts/${apiProductName}"

    ${CURL} -q -s -H "Content-Type:application/json" -u "$MOCHA_USER":"$MOCHA_PASSWORD" ${productURL} -X DELETE -D headers.txt -o deleteAPIProduct.txt > /dev/null 2>&1 ; ret=$?
    result=$(grep HTTP headers.txt | cut -d ' ' -f2)
    [[ ${ret} -ne 0 ]] && \
         logError "Failed to delete API Product with code $result"
    rm -f deleteAPIProduct.txt
    rm -f headers.txt

    logInfo "Successfully deleted API Product with code $result"

    return $result
}

