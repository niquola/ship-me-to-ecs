var YAML = require('js-yaml');
var fs = require('fs');

function load(cfg, path){
  if (!fs.existsSync(path)) {
    throw new Error("File " + path + " does not exists");
  }
  var swagger = YAML.safeLoad(fs.readFileSync(path));
  return transform(cfg, swagger);
};

function transform(cfg, swagger){
  delete swagger.paths["/__healthy"];

  for(var k in swagger.paths){
    if(swagger.paths.hasOwnProperty(k)){
      swagger.paths[k] = preprocessPath(cfg, k, swagger.paths[k]);
    }
  }

  swagger.definitions.Empty = {type: "object"};

  // delete swagger.definitions;
  return swagger;
};

function buildRequestParamsMap(parameters){
  var map = {};
  parameters.forEach(function(x){
    if(x.in == "query"){
      map["integration.request.querystring."+x.name] = "method.request.querystring." + x.name;
    } else if(x.in == "path") {
      map["integration.request.path."+x.name] = "method.request.path." + x.name;
    }
  });
  return map;
}

const CORS_ALLOW_HEADERS = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'";

function preprocessMethod(cfg, path, method, definition){
  var uri = definition["x-swagger-aws-uri"] || (cfg.baseUri + path);
  var integration = {
    responses: {
      default: {
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": "'*'",
          "method.response.header.Access-Control-Allow-Methods": "'*'",
          "method.response.header.Access-Control-Allow-Headers": CORS_ALLOW_HEADERS
        }
      }
    },
    uri: uri,
    passthroughBehavior: "when_no_match",
    type: "http",
    httpMethod: method.toUpperCase()
  };

  if(definition.parameters){
    integration.requestParameters = buildRequestParamsMap(definition.parameters);
  }

  definition["responses"]["200"]["headers"] = {
    "Access-Control-Allow-Origin": {type: "string"},
    "Access-Control-Allow-Methods": {type: "string"},
    "Access-Control-Allow-Headers": {type: "string"}
  };

  definition["x-amazon-apigateway-integration"] = integration;
  return definition;
}

const METHODS = ['put', 'post', 'get', 'patch', 'head'];

function preprocessPath(cfg, path, methods){
  METHODS.forEach(function(k){
    if(methods[k]){
      methods[k] = preprocessMethod(cfg, path, k, methods[k]);
    }
  });

  methods["options"] = {
    "consumes": [
      "application/json"
    ],
    "produces": [
      "application/json"
    ],
    "responses": {
      "200": {
        "description": "200 response",
        "schema": {
          $ref: "#/definitions/Empty"
        },
        "headers": {
          "Access-Control-Allow-Origin": {
            "type": "string"
          },
          "Access-Control-Allow-Methods": {
            "type": "string"
          },
          "Access-Control-Allow-Headers": {
            "type": "string"
          }
        }
      }
    },
    "x-amazon-apigateway-integration": {
      "responses": {
        "default": {
          "statusCode": "200",
          "responseParameters": {
            "method.response.header.Access-Control-Allow-Methods": '*',
            "method.response.header.Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
            "method.response.header.Access-Control-Allow-Origin": "'*'"
          }
        }
      },
      "requestTemplates": {
        "application/json": "{\"statusCode\": 200}"
      },
      "passthroughBehavior": "when_no_match",
      "type": "mock"
    }
  };

  return methods;
}

exports.transform = transform;
exports.load = load;
