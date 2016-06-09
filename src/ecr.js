"use strict";
let AWS = require('aws-sdk');
let ecr = new AWS.ECR({});

function ensure(cfg, cb){
  ecr.describeRepositories(
    {repositoryNames: [cfg.repositoryName]},
    function(err, data){
      if(err){
        createRepo(cfg, cb);
      } else {
        cb(data.repositories[0]);
      }
    }
  );
}

function createRepo(cfg, cb){
  console.log("Creating repository: ", cfg.repositoryName);
  ecr.createRepository(
    {repositoryName: cfg.repositoryName},
    function(err, data){
      if(err){
        console.log("Error while creating repository", err, err.stack);
      }else{
        ensure(cfg, cb);
        // cb(data);
      }
    });
}

function getLogin(repo, cb){
  ecr.getAuthorizationToken(
    {registryIds: [repo.registryId] },
    function(err, data){
      if(err){
        console.log("Error while login into repo", err, err.stack);
      } else {
        let auth = data.authorizationData[0];
        let token = (new Buffer(auth.authorizationToken, 'base64')).toString().replace(/^AWS:/,'');
        let cred  = {user: 'AWS', password: token, url: auth.proxyEndpoint };
        cb(cred);
      }
    }
  );
}

exports.ensure = ensure;
exports.getLogin = getLogin;
