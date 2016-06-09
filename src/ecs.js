"use strict";

let AWS = require('aws-sdk');
let ecs = new AWS.ECS();


function ensureTask(cfg, cb){
  createTask(cfg,cb);
  // ecs.describeTaskDefinition(
  //   {taskDefinition: cfg.serviceName},
  //   function(err, data) {
  //     if(err){
  //       createTask(cfg,cb);
  //     } else {
  //       createTask(cfg, cb);
  //     }
  //   });
}

function createTask(cfg, cb){
  ecs.registerTaskDefinition(
    taskDef(cfg),
    function(err, data){
      if(err){ console.log("Error while creating/updating ECS task: ", err, err.stack); }
      else{ cb(data); }
    }
  );
}

function containerDef(cfg){
  return Object.assign(cfg.container, {
    "name": cfg.serviceName,
    "portMappings": [{"hostPort": cfg.port, "containerPort": cfg.containerPort || 8080, "protocol": "tcp"}],
    "essential": true,
    "image": cfg.image.imageName + ':' + cfg.image.version
  });
}

function taskDef(cfg){
  return {
    "family": cfg.serviceName,
    "containerDefinitions": [containerDef(cfg)]
  };
}

function taskDef(cfg){
  return {
    "family": cfg.serviceName,
    "containerDefinitions": [containerDef(cfg)]
  };
}

function ensureService(cfg, cb){
  ecs.describeServices(
    {services: [cfg.serviceName], cluster: cfg.cluster},
    function(err, data){
      if(err){
        createService(cfg, cb);
      } else {
        updateService(cfg, cb);
      }
    }
  );
}
function serviceDef(cfg){
   return {
    service: cfg.serviceName,
    cluster: cfg.cluster,
    desiredCount: cfg.count || 1,
    taskDefinition: cfg.serviceName
   };
}

function createService(cfg, cb){
  console.log("Create")
}
function updateService(cfg, cb){
  ecs.updateService(serviceDef(cfg), function(err, data) {
    if (err) console.log('ERROR while updating service:', err, err.stack);
    else  cb(data);
  });
}

exports.ensureTask = ensureTask;
exports.ensureService = ensureService;
