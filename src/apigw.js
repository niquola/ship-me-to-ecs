"use strict";
let AWS = require('aws-sdk');
let ecr = new AWS.ECR({});
let LAMBDA = require('./lambda');

let apigateway = new AWS.APIGateway();

let Promise = require("bluebird");


function update(cfg, swagger, cb){
  return new Promise(function(resolve, reject){
    apigateway.putRestApi({
      body: JSON.stringify(swagger),
      restApiId: cfg.restApiId,
      failOnWarnings: true,
      mode: 'merge',
      parameters: {}
    }, function(err, data){
      if(err){
        console.log("Error while updating RestApi", err, err.stack);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function authorizers(cfg){
  return new Promise(function(resolve, reject){
    apigateway.getAuthorizers({ restApiId: cfg.restApiId }, function(err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        reject(err);
      } else {
        console.log("----------------------------------");
        console.log("Current authorizers", JSON.stringify(data, null, 2));           // successful response
        resolve(data);
      }
    });
  });
};

function createAuthorizer(cfg, lambda){
  return new Promise(function(resolve, reject){
    apigateway.createAuthorizer({
      authorizerUri: lambda.uri,
      identitySource: 'method.request.header.Authorization',
      name: lambda.name,
      restApiId: cfg.restApiId,
      type: 'TOKEN'
    }, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        reject(err);
      } else {
        console.log("Custom Authorizer " + lambda.name + " was created", data);
        resolve(data);
      }
    });
  });
}

function updateAuthorizer(cfg, swagger, cb){
  return new Promise(function(resolve, reject){
    console.log("We do not need to update authorizer");
    resolve(true);
  });
}

function ensureAuthorizers(cfg) {
  console.log("+++++++++++++++++++++++++");
  console.log("Deploy Custom Authorizer ");
  console.log("+++++++++++++++++++++++++");

  let auths = (cfg.lambdas || []).filter(function(x){ return x.authorizer; });

  let toCreateIdx = {};
  let existingAuthsIdx = {};
  auths.forEach(function(x){ toCreateIdx[x.name]=x;});

  let fnIndex = {}; 

  return new Promise(function(resolve, reject){
    LAMBDA.list(cfg).then(function(resp){
      resp.Functions.forEach(function(f){
        fnIndex[f.FunctionName] = f;
      });
      return authorizers(cfg);
    }).then(function(existings){
      let toCreate = [];
      existings.items.forEach(function(x){
        let name = x.name;
        if(toCreateIdx[name]){ delete toCreateIdx[name]; }
      });

      for(var k in toCreateIdx){
        toCreate.push(toCreateIdx[k]);
      }

      Promise.map(toCreate,function(x){
        x.uri = "arn:aws:apigateway:"+ cfg.region + ":lambda:path/2015-03-31/functions/" + fnIndex[x.name].FunctionArn + "/invocations";
        //x.uri = fnIndex[x.name].FunctionArn.replace(/:lambda:/,':apigateway:');
        //console.log(fnIndex[x.name]);
        return createAuthorizer(cfg, x);
      }, {concurrency: 1}).then(function(){
        resolve({message: "Authorizers was created"});
      });
    });
  });
};


exports.update = update;
exports.ensureAuthorizers = ensureAuthorizers;
