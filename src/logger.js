exports.log = function(msg, obj){
  console.log("-----------------------------");
  console.log(msg, JSON.stringify(obj, null, 2));
  console.log("-----------------------------");
};
