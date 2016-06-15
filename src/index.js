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
let LAMBDA = require('./lambda');

function log(msg, obj){
  console.log("==============================");
  console.log(msg, JSON.stringify(obj, null, 2));
  console.log("-----------------------------");
}

exports.updateAPI = function(){
  ELB.find(cfg).then(function(elb){
    cfg.baseUri = "http://" + elb.DNSName;
    console.log(cfg.baseUri);
    let swagger = SWAGGER.load(cfg, cfg.swaggerPath);
    log("Prepare swagger", swagger);
    return APIGW.update(cfg, swagger);
  }).then(function(restApi){
    log("API GateWay was updated", restApi);
    return APIGW.ensureAuthorizers(cfg);
  }).then(function(auth){
    console.log("Done!");
  });
};

exports.run = function(){

  cfg.repositoryName = cfg.serviceName;

  let version = (new Date()).toISOString().replace(/[:.]/g,'-') + "-" + proc.execSync('git rev-parse HEAD').toString().slice(0,7);

  ECR.ensure(cfg).then(function(repo){
    log("Ensure repository:", repo);
    cfg.repo = repo;
    cfg.image = {imageName: repo.repositoryUri, version: version};
    return DOCKER.build(cfg.image);
  }).then(function(){
    return ECR.getLogin(cfg.repo);
  }).then(function(cred){
    log("REPO credentials", cred);
    cfg.repo.cred = cred;
    return DOCKER.login(cred);
  }).then(function(){
    log("Logged in with", cfg.repo.cred);
    return DOCKER.push(cfg.image);
  }).then(function(){
    log("Image was pushed", cfg.image);
    return ECS.ensureTask(cfg);
  }).then(function(task){
    cfg.task = task;
    log("Task was updated", task);
    return ELB.ensure(cfg);
  }).then(function(elb){
    log("ELB configured: ", elb);
    cfg.baseUri = "http://" + elb.DNSName;
    return ECS.ensureService(cfg);
  }).then(function(srv){
    log("Service was updated", srv);
    let swagger = SWAGGER.load(cfg, cfg.swaggerPath);
    log("Prepare swagger", swagger);
    return APIGW.update(cfg, swagger);
  }).then(function(restApi){
    log("API GateWay was updated", restApi);
    return LAMBDA.deploy(cfg);
  }).then(function(lambda){
    log("Lambda was updated", lambda);
    return APIGW.ensureAuthorizers(cfg);
  }).then(function(){
    log("Alles", {});
  });
};

