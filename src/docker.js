"use strict";

let fs = require('fs');
let proc = require('child_process');
let Promise = require("bluebird");

function docker(args, cb){
  console.log("docker " + args.join(" "));
  return new Promise(function (resolve, reject) {
    let buildProc = proc.spawn("docker", args);
    buildProc.stdout.pipe(process.stdout);
    buildProc.stderr.pipe(process.stderr);
    buildProc.on('exit', function(code){
      if(code === 0){
        resolve(code);
      }else {
        reject(code);
      }
    });
  });
}


function fullName(params){
  return params.imageName + ':' + params.version;
}

function build(params, cb){
  docker(["build","-t", fullName(params) ,"."], cb);
}

function login(params, cb){
  docker(["login", "-u", params.user, "-p", params.password, "-e", "none", params.url], cb);
}

function push(params, cb){
  docker(["push", fullName(params)], cb);
}

exports.docker = docker;
exports.build = build;
exports.login = login;
exports.push = push;
