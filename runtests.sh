mocha tests/*.*.integ.test.js --timeout 90000 && nyc mocha tests/*.*.unit.test.js
nodever=$(node --version)
if ! [[ $nodever =~ 'v6.' ]]; then
    wjsh=$(which jshint)
    echo $wjsh
    if [[ -z $wjsh ]]; then
        npm install -g jshint
    fi
    pushd codequality
    node diffErrors.js
    popd
fi
