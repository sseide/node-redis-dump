/**
 * Redis dump main file.
 *
 * @author Dmitriy Yurchenko <evildev@evildev.ru>
 * @author Stefan Seide <account-github@seide.st>
 */

const async = require('async');
const _ = require('underscore');

/**
 * Redis dump class.
 *
 * @param {Object} params init params.
 * @constructor
 */
const RedisDump = module.exports = function(params) {
  'use strict';

  let client;

  /**
   * @return {String} version of library.
   */
  this.getVersion = function() {
    return require('../package.json').version;
  };

  /**
   * @return {Object} redis client.
   */
  this.getClient = function() {
    return client || params.client;
  };

  /**
   * @return {Object} initialize parameters.
   */
  this.getConnectParams = function() {
    return params;
  };

  /**
   * Connect to redis server if not set client during initialize.
   * The paras object from Import/Export initializations is passed through to ioredis
   * to create a new client connection
   *
   * @return {Boolean} true if success connect.
   */
  this.connect = function() {
    const Redis = require('ioredis');
    client = new Redis(params);
    return !client;
  };
};

/**
 * Read key callback by type.
 */
const getForTypeCallback = function(key, data, callback) {
  'use strict';

  /**
   * Read scores by values.
   *
   * @param {Array} values
   * @param {Function} callback
   */
  const readScores = function(values, callback) {
    const result = [];

    /**
     * Get scores recursive.
     */
    const getRecursive = function() {
      if (!values.length) {
        callback(null, result);
        return;
      }

      const value = values.pop();

      this.getClient().zscore(key, value, function(err, score) {
        if (err) {
          callback(err);
          return;
        }

        result.push(score);
        getRecursive();
      });
    }.bind(this);

    getRecursive();
  }.bind(this);

  /**
   * Read key.
   *
   * @param {String} key
   * @param {String} type
   * @param {Function} rkCallback
   */
  const readKey = function(key, type, rkCallback) {
    const params = [key];
    const command = {
        set: 'smembers',
        zset: 'zrange',
        list: 'lrange',
        hash: 'hgetall'
      }[type] || 'get';

    if (command.indexOf('range') !== -1) {
      params.push(0);
      params.push(-1);
    }

    params.push(function(err, values) {
      if (err) {
        rkCallback(err);
        return;
      }

      switch (type) {
        case 'zset':
          readScores(_.clone(values).reverse(), function(err, scores) {
            rkCallback(null, _.zip(scores, values));
          });
          break;

        default:
          rkCallback(null, values);
          break;
      }
    });

    this.getClient()[command].apply(this.getClient(), params);
  }.bind(this);


  switch (this.getExportParams().type) {
    // Export as redis type.
    case 'redis':
      return function(err, type) {
        const type2PrintSetCommand = {
          string: 'SET',
          set: 'SADD',
          zset: 'ZADD',
          list: 'RPUSH',
          hash: 'HSET'
        };

        if (!data) {
          data = '';
        }

        readKey(key, type, function(err, value) {
          if (err) {
            callback(err);
            return;
          }

          const command = type2PrintSetCommand[type];

          key = key.trim();

          switch (type) {
            case 'set':
              _.each(value, function(item) {
                data += command + ' "' + key + '" "' + item + '"\n';
              });
              break;

            case 'zset':
              _.each(value, function(item) {
                data += command + ' "' + key + '" ' + item[0] + ' "' + item[1] + '"\n';
              });
              break;

            case 'hash':
              _.each(_.pairs(value), function(item) {
                data += command + ' "' + key + '" "' + item[0] + '" "' + item[1] + '"\n';
              });
              break;

            default:
              data += command + ' "' + key + '" "' + value + '"\n';
              break;
          }

          callback(null, data);
        });
      };

    // Export as json type.
    case 'json':
      return function(err, type) {
        if (!data) {
          data = {};
        }

        readKey(key, type, function(err, value) {
          if (err) {
            callback(err);
            return;
          }

          switch (type) {
            case 'zset':
              const withoutScores = [];
              _.each(value, function(item) {
                withoutScores.push(item[1]);
              });
              value = withoutScores;
              break;
          }

          data[key.trim()] = value;

          callback(null, data);
        });
      };
  }
};

/**
 * Make redis dump.
 *
 * @param {Object} params
 */
RedisDump.prototype.export = function(params) {
  'use strict';

  /**
   * @return {Object} export params
   */
  this.getExportParams = function() {
    return params;
  };

  async.waterfall([
    /**
     * Get keys.
     * @param {function} callback - async waterfall callback
     */
    function(callback) {
      const pattern = this.getExportParams().keyPrefix ? this.getExportParams().keyPrefix + '*' : '*';
      this.getClient().keys(pattern, callback);
    }.bind(this),

    /**
     * Read keys.
     *
     * @param {Array} keys
     * @param {function} callback - async waterfall callback
     */
    function(keys, callback) {
      let exportData;

      /**
       * Read keys recursive.
       */
      const readKeysRecursive = function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        if (data) {
          exportData = data;
        }

        if (!keys.length) {
          callback(null, exportData);
          return;
        }

        const key = keys.pop();

        this.getClient().type(key, getForTypeCallback.call(this, key, exportData, readKeysRecursive));
      }.bind(this);

      readKeysRecursive();
    }.bind(this)
  ], function(err, data) {
    if (!_.isFunction(params.callback)) {
      params.callback = function() {
      };
    }

    params.callback(err, data);
  });
};

/**
 * Import redis data.
 *
 * @param {object} params - import parameter
 */
RedisDump.prototype.import = function(params) {
  'use strict';

  // Import report.
  const report = {
    inserted: 0,
    errors: 0
  };

  /**
   * @return {Object} export params
   */
  this.getImportParams = function() {
    return params;
  };

  async.waterfall([
    /**
     * Check import type given
     * @param {function} callback - async waterfall callback
     */
    function(callback) {
      if (!params.type) {
        params.type = 'redis';
      }

      if (params.type !== 'redis') {
        callback('Import type "' + params.type + '" is not supported!');
        return;
      }

      callback();
    },

    /**
     * Select DB if need.
     * @param {function} callback - async waterfall callback
     */
    function(callback) {
      if (_.isNumber(params.db)) {
        this.getClient().select(params.db, callback);
      }
      else {
        callback(null, 'OK');
      }
    }.bind(this),

    /**
     * Flush all if need.
     * @param status status
     * @param {function} callback - async waterfall callback
     */
    function(status, callback) {
      if (params.clear) {
        console.log('clear db');
        this.getClient().flushdb();
      }

      callback();
    }.bind(this),

    /**
     * Import data into redis
     * @param {function} callback - async waterfall callback
     */
    function(callback) {
      const items = params.data.split(new RegExp('(SET|LSET|RPUSH|RPUSHX|LPUSH|LPUSHX|SADD|ZADD|HSET|LTRIM) ', 'g'));

      /**
       * Recursive add.
       */
      const addRecursive = function() {
        if (items.length < 2) {
          callback();
          return;
        }

        /**
         * Callback function given to redis client apply() call.
         * @param {Object} err - error object if something goes wrong
         * @param {object} status - redis status returned from redis client function call
         */
        const redisCallback = function(err, status) {
          if (err) {
            callback(err);
            return;
          }

          // LPUSH / RPUSH return length of list after insert as status code,therefor cannot just add status
          // as no multi value insert allowed currently just add 1
          if (status === 'OK' || _.isNumber(status)) {
            report.inserted += 1;
          }
          else {
            // Hm...
            report.errors += 1;
          }

          addRecursive();
        };

        let args;
        let command;
        let callArgs = [];

        do {
          command = items.shift().trim();
        }
        while (command === '');
        args = items.shift();

        if (!(command && args)) return;

        try {
          switch (command) {
            case 'SET':
            case 'SADD':
            case 'LPUSH':
            case 'LPUSHX':
            case 'RPUSH':
            case 'RPUSHX':
              // only simple form with one value is allowed, no options (EX, NX, ...)
              callArgs = args.match(new RegExp('"?(.+?)"?\\s+(["\'](.+?)["\']|(.+?))(?:\\s|$)', 'i')).slice(1, 3);
              callArgs[1] = callArgs[1].replace(/(^["']|["']$)/g, '');   // remove optional quotes around value string
              break;

            case 'ZADD':
            case 'LSET':
              // only simple form with one value: "ZADD key 1 value", no options (NX, XX, ...)
              callArgs = args.match(new RegExp('"?(.+?)"?\\s+"?([0-9]+?)"?\\s+(["\'](.+?)["\']|(.+?))(\\s|$)', 'i')).slice(1, 4);
              callArgs[2] = callArgs[2].replace(/(^["']|["']$)/g, '');   // remove optional quotes around value string
              break;

            case 'HSET':
              callArgs = args.match(new RegExp('"?(.+?)"?\\s+"?(.+?)"?\\s+(["\'](.+?)["\']|(.+?))\\s*$', 'i')).slice(1, 4);
              callArgs[2] = callArgs[2].replace(/(^["']|["']$)/g, '');   // remove optional quotes around value string
              break;

            case 'LTRIM':
              // command "LTRIM key 1 1"
              callArgs = args.match(new RegExp('"?(.+?)"?\\s+([0-9]+?)\\s+([0-9]+?)\\s*$', 'i')).slice(1, 4);
              break;

            default:
              console.error(command, args);
              callback('Error import data! Not supported type!');
              return;
          }
        }
        catch (errCmd) {
          callback('FAIL parse command of known type: ' + command);
        }

        callArgs.push(redisCallback);
        this.getClient()[command.toLowerCase()].apply(this.getClient(), callArgs);
      }.bind(this);

      addRecursive();
    }.bind(this)
  ], function(err) {
    if (!_.isFunction(params.callback)) {
      params.callback = function() {
      };
    }

    params.callback(err, report);
  });
};
