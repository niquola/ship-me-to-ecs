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
  delete swagger.definitions;
  return swagger;
};


function buildRequestParamsMap(parameters){
  var map = {};
  parameters.forEach(function(x){
    map["integration.request.querystring."+x.name] = "method.request.querystring." + x.name ;
  });
  return map;
}

function preprocessMethod(cfg, path, method, definition){
  var integration = {
    responses: {default: {statusCode: 200}},
    uri: cfg.baseUri + path,
    passthroughBehavior: "when_no_match",
    type: "http",
    httpMethod: method.toUpperCase()
  };

  if(definition.parameters){
    integration.requestParameters = buildRequestParamsMap(definition.parameters);
  }

  definition["x-amazon-apigateway-integration"] = integration;
  definition.responses = {}; // fix aws
  return definition;
}

const METHODS = ['put', 'post', 'get', 'option', 'patch', 'head'];

function preprocessPath(cfg, path, methods){
  METHODS.forEach(function(k){
    if(methods[k]){
      methods[k] = preprocessMethod(cfg, path, k, methods[k]);
    }
  });
  return methods;
}

exports.transform = transform;
exports.load = load;
