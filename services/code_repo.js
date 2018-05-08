/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var db = require('arangojs')({
  arangoVersion: 20800

});
var Promise = require('bluebird');

String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};


module.exports.all = function(node, year) {
  var query = 'for e IN GRAPH_NEIGHBORS (\'exports\', ' +
    '{_key:@node}, ' +
    '{maxDepth:1, includeData:true, direction:\'inbound\', neighborExamples:{year:2012}})  ' +
    'SORT e.code return e';
  return getData(query, node, year);
};

module.exports.moreIn = function(node) {
  var query =
    'for e IN GRAPH_TRAVERSAL_TREE(\'exports\', {_key:@node}, ' +
    ' \'inbound\' ,  \'children\',{uniqueness:"global"}) SORT e.code return e';
  return getData(query, node, '');
};

module.exports.autoName = function(name) {
  name = 'prefix:' + name;

  var query = 'for e IN  FULLTEXT(export_nodes,\'name\', \'' + name + '\') \
                    FILTER e.code != ""\
                    LIMIT 10 return {"term": CONCAT(e.name,\'(\', e.code, \')\' ), "code":e.code, "id":e.id}';
  return getData(query, name, '');
};

module.exports.autoCode = function(code) {
  code = 'prefix:' + code;

  var query =
    'for e IN FULLTEXT(export_nodes,\'code\', \'' + code + '\')  limit 10 return  {"term": CONCAT(e.code,\'(\', e.name, \')\' ), "code":e.code, "id":e.id}';
  return getData(query, code, '');
};

module.exports.findName = function(name) {
  name = 'prefix:' + name;

  var query =
    'for e IN FULLTEXT(export_nodes,\'name\',@node)  for n in GRAPH_SHORTEST_PATH(\'exports\', {_key:\'v-1\'}, e, {includeData: true}) return n';
  return getData(query, name, '');
};

module.exports.findCode = function(code) {
  code = 'prefix:' + code;

  var query =
    'for e IN FULLTEXT(export_nodes,\'code\',@node)  for n in GRAPH_SHORTEST_PATH(\'exports\', {_key:\'v-1\'}, e, {includeData: true}) return n';
  return getData(query, code, '');
};

//Query noSQL
function getData(query, param, year) {
  return db.query(query).then(function(cursor) {
    return cursor.all()
  });
}
