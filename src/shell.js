"use strict";

let proc = require('child_process');
let Promise = require("bluebird");

function bash(cmd, cb){
  console.log("EXECUTE:", cmd);
  return new Promise(function (resolve, reject) {
    let buildProc = proc.exec("bash -c \"" + cmd + "\"");
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

exports.bash = bash;
