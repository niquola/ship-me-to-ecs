"use strict";
let AWS = require('aws-sdk');
let ecr = new AWS.ECR({});

let apigateway = new AWS.APIGateway();

function update(cfg, swagger, cb){
  apigateway.putRestApi({
      body: JSON.stringify(swagger),
      restApiId: cfg.restApiId,
      failOnWarnings: true,
      mode: 'merge',
      parameters: {}
    },
    function(err, data){
      if(err){
        console.log("Error while updating RestApi", err, err.stack);
      } else {
        cb(data);
      }
    }
  );
}
exports.update = update;
