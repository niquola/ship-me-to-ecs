"use strict";

let AWS = require('aws-sdk');
let elb = new AWS.ELB({});

function listenerDef(cfg){
  return {
    InstancePort: cfg.port,
    LoadBalancerPort: 80,
    Protocol: 'tcp'
    //SSLCertificateId: 'STRING_VALUE'
  };
}
function elbDef(cfg){
  return {
    Listeners: [listenerDef(cfg)],
    LoadBalancerName: cfg.serviceName,
    //AvailabilityZones: cfg.zones,
    SecurityGroups: cfg.securityGroups,
    Subnets: cfg.subnets,
    Tags: [{Key: 'group', Value: cfg.serviceName}]
  };
}


function healthCheckDef(cfg){
  return {
    HealthyThreshold: 10,
    Interval: 30,
    Target: 'HTTP:' + cfg.port +'/__healthy',
    Timeout: 5,
    UnhealthyThreshold: 10
  };
}

function configureHealthCheck(cfg, cb){
  elb.configureHealthCheck(
    {
      HealthCheck: healthCheckDef(cfg),
      LoadBalancerName: cfg.serviceName
    },
    function(err, data) {
      if(err) {
        console.log("Error while setting up health checks for ELB", err, err.stack);
      } else {
        cb(data);
      }
    });
}

function createElb(cfg, cb) {
  elb.createLoadBalancer(
    elbDef(cfg),
    function(err, data){
      if (err) {
        console.log("Could not create ELB:", err, er.stack);
      } else {
        let elb = data.LoadBalancerDescriptions[0];
        configureHealthCheck(cfg, function(hch){
          console.log("Health Check configured", hch);
          cb(elb);
        });
      }
    });
};

function updateListeners(cfg, listener, cb){
  console.log("Update listeners");
  elb.deleteLoadBalancerListeners(
    {LoadBalancerName: cfg.serviceName, LoadBalancerPorts: [80]},
    function(err, data) {
      if (err) console.log("ERROR while deleting ELB ports", err, err.stack);
      else {
        console.log("ELB Listener deleted", data);
        elb.createLoadBalancerListeners(
          {LoadBalancerName: cfg.serviceName, Listeners: [listenerDef(cfg)]},
          function(err, data) {
            if (err) console.log('ERROR while creating ELB ports', err, err.stack);
            else {
              cb(data); 
            }
          });
      }
    });
}

function updateElb(cfg, data, cb){
  let elb = data.LoadBalancerDescriptions[0];
  let listener = elb.ListenerDescriptions[0];
  if(listener && listener.Listener.InstancePort != cfg.port){
    updateListeners(cfg, listener, function(){
      configureHealthCheck(cfg, function(){
        cb(elb);});});
  } else {
    cb(elb);
  }
};

exports.ensure = function(cfg, cb) {
  let params = {LoadBalancerNames: [cfg.serviceName]};
  elb.describeLoadBalancers(
    params,
    function(err, data){
      if (err) {
        createElb(cfg, cb);
      } else {
        configureHealthCheck(cfg, function(){
          updateElb(cfg, data, cb);});
      }
    });
};
