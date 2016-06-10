"use strict";

let fs = require('fs');
let AWS = require('aws-sdk');
let proc = require('child_process');

let cfg = JSON.parse(fs.readFileSync('./aws.json'));

let params = process.env.AWS_PROFILE ? {profile: process.env.AWS_PROFILE} : {};
AWS.config.credentials = new AWS.SharedIniFileCredentials(params);
AWS.config.update({region: cfg.region});

let ELB = require('./elb');
let SWAGGER = require('./swagger');
let DOCKER = require('./docker');
let ECR = require('./ecr');
let ECS = require('./ecs');
let APIGW = require('./apigw');

function log(msg, obj){
  console.log("-----------------------------");
  console.log(msg, JSON.stringify(obj, null, 2));
  console.log("-----------------------------");
}

exports.updateAPI = function(){
  ELB.find(cfg, function(elb){
    console.log(elb);
    if(elb){
      cfg.baseUri = "http://" + elb.DNSName;
      console.log(cfg.baseUri);
      let swagger = SWAGGER.load(cfg, cfg.swaggerPath);
      log("Prepare swagger", swagger);
      APIGW.update(cfg, swagger, function(restApi){
        log("API GateWay was updated", restApi);
      });
    } else {
      console.log("UPS:", elb);
    }
  });
};

exports.run = function(){

  cfg.repositoryName = cfg.serviceName;

  let version = (new Date()).toISOString().replace(/[:.]/g,'-') + "-" + proc.execSync('git rev-parse HEAD').toString().slice(0,7);

  ECR.ensure(cfg, function(repo){
    log("Ensure repository:", repo);
    let image = {imageName: repo.repositoryUri, version: version};
    DOCKER.build(image, function(){
      ECR.getLogin(repo, function(cred){
        log("REPO credentials", repo);
        DOCKER.login(cred, function(){
          log("Logged in with", cred);
          DOCKER.push(image, function(){
            cfg.image = image;
            log("Image was pushed", image);
            ECS.ensureTask(cfg, function(task){
              cfg.task = task;
              log("Task was updated", task);
              ELB.ensure(cfg, function(elb){
                // console.log(elb);
                log("ELB configured: ", elb);
                ECS.ensureService(cfg, function(srv){
                  log("Service was updated", srv);
                  cfg.baseUri = "http://" + elb.DNSName;
                  let swagger = SWAGGER.load(cfg, cfg.swaggerPath);
                  log("Prepare swagger", swagger);
                  APIGW.update(cfg, swagger, function(restApi){
                    log("API GateWay was updated", restApi);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

