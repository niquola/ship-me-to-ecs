"use strict";

let AWS = require('aws-sdk');
let fs = require('fs');
let shell = require('./shell');
let Promise = require("bluebird");

let bash = shell.bash;


function fnExists(LAMBDA, name){
  return new Promise(function(resolve, reject){
    LAMBDA.getFunction({FunctionName: name}, function(err, data){
      if(err){ resolve(false);}
      else resolve(true);
    });
  });
}
function deploy(cfg, lambda){
  var LAMBDA = Promise.promisifyAll(new AWS.Lambda({
    apiVersion: '2015-03-31',
    region: cfg.region
  }), {filter: function(name) {return name.indexOf('Async') < 0;}});

  console.log(LAMBDA.getFunction);
  console.log("+++++++++++++++++++++++++");
  console.log("Deploy Lambda " + lambda.path);
  console.log("+++++++++++++++++++++++++");

  process.chdir('./' + lambda.path);

  return bash('source ~/.nvm/nvm.sh && nvm install 4.3.2')
    .then(function(res){
      console.log("node was installed");
      return bash('source ~/.nvm/nvm.sh && nvm use 4.3.2 && npm install');
    }).then(function(res){
      console.log("npm was installed");
      return bash('rm -rf ../' + lambda.path + '.zip && zip -r ../' + lambda.path + '.zip ./*');
    }).then(function(res){
      console.log('Package was zipped');
      process.chdir('../');
      return fnExists(LAMBDA, lambda.name);
    }).then(function(exists){
      var buffer = fs.readFileSync('./' + lambda.path + '.zip');
      if(exists){
        console.log("Update lambda");
        return LAMBDA.updateFunctionCodeAsync({
            ZipFile: buffer,
            FunctionName: lambda.name,
            Publish: true
          });
      } else {
        console.log("Create lambda");
        return LAMBDA.createFunctionAsync({
            Code: { ZipFile: buffer },
            FunctionName: lambda.name,
            Handler: 'index.handler',
            Role: lambda.role,
            Runtime: 'nodejs4.3',
            Description: lambda.description || 'TODO',
            MemorySize: 300,
            Publish: true,
            Timeout: 100
          });
      }
    }).catch(function(err){
      console.log("ERROR WHILE LAMBDA:", err);
    }).then(function(res){
      console.log("Lambda was updated/created", res);
    });
}

function run(cfg){
  if(cfg.lambdas && cfg.lambdas.length > 0){
    return deploy(cfg, cfg.lambdas[0]);
  }else {
    console.log("No lambdas found in config");
  }
}
exports.run = run;
