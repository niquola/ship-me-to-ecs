"use strict";

let AWS = require('aws-sdk');
let proc = require('child_process');
let fs = require('fs');

function bash(cmd, cb){
  console.log(cmd);
  let buildProc = proc.exec("bash -c \"" + cmd + "\"");
  buildProc.stdout.pipe(process.stdout);
  buildProc.stderr.pipe(process.stderr);
  buildProc.on('exit', function(code){
    console.log("EXIT:", arguments);
    if(code === 0){
      cb();
    }
  });
}

function deploy(cfg, lambda){
  var LAMBDA = new AWS.Lambda({
    apiVersion: '2015-03-31',
    region: cfg.region
  });
  console.log("+++++++++++++++++++++++++");
  console.log("Deploy Lambda " + lambda.path);
  console.log("+++++++++++++++++++++++++");
  
  process.chdir('./' + lambda.path);
  bash('source ~/.nvm/nvm.sh && nvm install 4.3.2', function(res){
    console.log("Node installed");
    bash('source ~/.nvm/nvm.sh && nvm use 4.3.2 && npm install', function(res){
      bash('rm -rf ../' + lambda.path + '.zip && zip -r ../' + lambda.path + '.zip ./*', function(res){
        console.log('Package was zipped');
        process.chdir('../');
        var buffer = fs.readFileSync('./' + lambda.path + '.zip');

        LAMBDA.getFunction({FunctionName: lambda.name}, function(err, data) {
          if (err){
            console.log(err);
            console.log("CREATE");
            var params = {
              Code: { ZipFile: buffer },
              FunctionName: lambda.name,
              Handler: 'index.handler',
              Role: lambda.role,
              Runtime: 'nodejs4.3',
              Description: lambda.description || 'TODO',
              MemorySize: 300,
              Publish: true,
              Timeout: 100
            };
            LAMBDA.createFunction(params, function(err, data) {
              if (err) {
                console.log(err, err.stack); 
              } else {
                console.log("Lambda " + lambda.name + " was created", data);
              }
            });
          }
          else {
            var params = {
              ZipFile: buffer,
              FunctionName: lambda.name,
              Publish: true
            };
            LAMBDA.updateFunctionCode(params, function(err, data) {
              if (err) {
                console.log(err, err.stack); 
              } else {
                console.log("Lambda " + lambda.name + "was updated", data);
              }
            });
          }
        });
      });
    });
  });
}

function run(cfg){
  cfg.lambdas.forEach(function(lambda){
    deploy(cfg, lambda);
  });
}
exports.run = run;
