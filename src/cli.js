"use strict";


function deploy(){
  let deploy = require('./index');
  deploy.run();
}

function swagger(){
  let fs = require('fs');
  let SWAGGER = require('./swagger.js');

  let cfg = JSON.parse(fs.readFileSync('./aws.json'));
  let swagger = SWAGGER.load(cfg, './api/swagger/swagger.yaml');

  console.log(JSON.stringify(swagger, null, 2));
}

function init(){
  console.log(arguments);
}

function plan(){
  console.log(arguments);
}

const SUBCOMMANDS = {
  'init': {fn: init,
           desc: 'Init your project'},
  'plan': {fn: plan,
           desc: 'What will happen'},
  'swagger': {fn: swagger,
              desc: 'Show your aws swagger'},
  'deploy': {fn: deploy,
             desc: 'Deploy to ecs'}
};


exports.run = function(args){
  let cmd = SUBCOMMANDS[args[0]];
  if(cmd){
    cmd.fn(args.slice(1));
  } else {
    console.log("shipme [subcommand] [args]\n");
    for(let k in SUBCOMMANDS){
      console.log(k + ":");
      console.log(SUBCOMMANDS[k].desc);
      console.log();
    }
  }
};
