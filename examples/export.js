/**
 * Redis export example.
 *
 * @author Dmitriy Yurchenko <feedback@evildev.ru>
 */

const RedisDump = require('./../index.js');
const dump = new RedisDump({
  host: 'localhost',
  port: 6379,
  password: ''

  // Or if connection is exist
  // client: YOUR_REDIS_CLIENT
});

dump.connect();
dump.export({
  type: 'redis',
  // isCompress: false,
  callback: function(err, data) {
    'use strict';

    if (err) {
      console.log('Could\'t not make redis dump!', err);
      return;
    }

    console.log('--------- REDIS DUMP ----------');
    if (typeof data === 'string' && data.length) {
      console.log(data);
    }
    console.log('--------- /REDIS DUMP ----------');
  }
});
