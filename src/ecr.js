"use strict";
let AWS = require('aws-sdk');
let Promise = require("bluebird");

let ecr = Promise.promisifyAll(new AWS.ECR({}));

function ensure(cfg, cb){
  return new Promise(function(resolve, reject){
    ecr.describeRepositories(
      {repositoryNames: [cfg.repositoryName]},
      function(err, data){
        if(err){
          createRepo(cfg).then( resolve);
        } else {
          resolve(data.repositories[0]);
        }
      }
    );
  });
}

function createRepo(cfg, cb){
  console.log("Creating repository: ", cfg.repositoryName);
  return new Promise(function(resolve, reject){
    ecr.createRepository(
      {repositoryName: cfg.repositoryName},
      function(err, data){
        if(err){
          console.log("Error while creating repository", err, err.stack);
          reject(err);
        }else{
          resolve(data);
        }
      });
  });
}

function getLogin(repo, cb){
  return new Promise(function(resolve, reject){
    ecr.getAuthorizationToken({registryIds: [repo.registryId] }, function(err,data){
      if(err){
        console.log("Error while login into repo", err, err.stack);
        reject(err);
      }else{
        let auth = data.authorizationData[0];
        let token = (new Buffer(auth.authorizationToken, 'base64')).toString().replace(/^AWS:/,'');
        let cred  = {user: 'AWS', password: token, url: auth.proxyEndpoint };
        resolve(cred);
      }
    });
  });
}

exports.ensure = ensure;
exports.getLogin = getLogin;
