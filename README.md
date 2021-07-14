Node.js redis dump library
==========

Backup and restore your Redis data written on node.js

This is a fork of the original "node-redis-dump" library from Dmitriy Yurchenko (https://github.com/EvilDevRu/node-redis-dump.git)
to get bugfixes and security updates applied.

## Installation

```
  $ npm install node-redis-dump2
```

## Quick Start
The param object given to RedisDump is passed to "ioredis" library to create a new client from.
After object initialization an explicit call to `connect()` must be done.
 
See `examples/` directory for this too.

```js
const RedisDump = require('./node-redis-dump');
let dump = new RedisDump({
    host: 'localhost',
    port: 6379,
    password: ''
});

dump.connect();
dump.export({
    type: 'redis',
    callback: function(err, data) {
        if (err) {
            console.log('Could\'t not make redis dump!', err);
            return;
        }

        console.log('--------- REDIS DUMP ----------');
        console.log(data);
        console.log('--------- /REDIS DUMP ----------');
    }
});
```

Optional an already existing redis client can be given to the constructor to reuse it.

```js
const RedisDump = require('./node-redis-dump');
const Redis = require('ioredis');

let redis = new Redis({
    host: 'localhost',
    port: 6379,
    password: ''
});
let dump = new RedisDump({client: redis});

dump.export({
    type: 'redis',
    //isCompress: false, (not working now)
    callback: function(err, data) {
        if (err) {
            console.log('Could\'t not make redis dump!', err);
            return;
        }
    
        console.log('--------- REDIS DUMP ----------');
        console.log(data);
        console.log('--------- /REDIS DUMP ----------');
    }
});
```

## Known Issues

* does not work with Redis streams (neither export nor import)
* does not work with binary data (neither import into redis nor export from redis)
