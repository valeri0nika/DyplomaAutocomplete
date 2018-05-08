'use strict()'; //Global libs
//debug
var util = require('util');

//var memProfile = require('memoizee/profile'); // debug
var Promise = require('bluebird');
var memoize = require('memoizee');
var _ = require('lodash');
var compress = require('compression');
var bodyParser = require('body-parser');
var logger = require('tracer').dailyfile({
  root: '.',
});

//My libs
var codeRepo = require('./services/code_repo');

var restify = require('restify');

//Server config
var server = restify.createServer({
  name: 'abbottpm-code',
  version: '1.0.0',
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.gzipResponse());
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS({
  origins: ['http://abbottpm.com'],
}));

var allMem = memoize(codeRepo.all);
var autoNameMem = memoize(codeRepo.autoName);
var autoCodeMem = memoize(codeRepo.autoCode);
var moreInMem = memoize(codeRepo.moreIn);

server.get('/rest/all', function(req, res, next) {
  var year = 2012;
  if (req.query.year) {
    year = req.query.year;
  }

  allMem('v-1', year)
    .then(function(result) {
      //return res.send(result);
      var arr = result.map(function(node) {
        return allMem(node._key, year); //.then(function(r){ return r});
      });

      Promise.settle(arr).then(function(ress) {
        var all = result.map(function(node, index) {
          var nwc = node;
          nwc['children'] = ress[index].value();
          return nwc;
        });

        res.send(all);
      });
    }).catch(function(error) {
      logger.error(error);
      return res.send(error);
    });

});

server.get('/rest/auto/:name', function(req, res, next) {
  var name = req.params.name;
  if (!name) {
    return res.send([]);
  }

  autoNameMem(name).then(function(results) {
      return res.send(results);
    }).catch(function(err) {
      console.log(err);
      return res.send([]);
    });
});

server.get('/rest/more', function(req, res, next) {
  var id = req.query.id;
  if (!id) {
    next();
  }

  moreInMem(id).then(function(result) {
    _.flattenDeep(result).map(function(v) {
      v.children.sort(compare);
    });

    return res.send(_.flattenDeep(result));

  }).catch(function(err) {
    logger.error(err);
    //return res.send([]);
  });

});

server.get('/rest/find', function(req, res, next) {
  var name = req.query.name;
  var code = req.query.code;



  logger.info(name);
  logger.info(code);
  if (name) { //do code
    codeRepo.findName(name).then(function(result) {
      //console.log(result);
      //var arr = result.map(function(v) {
      var core = _.chain(result[0].vertices).tail().value();
      var first = _.first(core);
      //console.log(core);
      first['children'] = [];
      first['children'] = core[1];
      //});
      var ress = [first];
      return res.send(ress);
    }).catch(function(err) {
      logger.error(err);
      return res.send([]);
    });
  }

  if (code) { //do code
    codeRepo.findCode(code).then(function(result) {
      //console.log(result[0]);
      var core = _.chain(result[0].vertices).tail().value();
      var first = _.first(core);
      first['children'] = [];
      first['children'].push(core[1]);

      //return first;
      //});

      //console.log(arr);
      var ress = [first];
      return res.send(ress);
    }).catch(function(err) {
      logger.error(err);
    });
  }

  next();

});

/*Utilit*/
function compare(a, b) {
  if (a.code < b.code)
    return -1;
  if (a.code > b.code)
    return 1;
  return 0;
}

var port = process.env.PORT || 3000;
server.listen(port, function() {

  var host = server.address().address;
  var port = server.address().port;
  allMem.clear();
  moreInMem.clear();
  console.log('ExportCode app listening at http://%s:%s', host, port);

});
