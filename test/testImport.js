'use strict';

const expect = require('chai').expect;
const Redis = require('ioredis-mock');
const RedisDump = require('../lib/node-redis-dump');

describe('Test file import function', function() {

  let redis;
  let dump;

  beforeEach(function() {
    redis = new Redis({
      data: {}
    });
    dump = new RedisDump({client: redis});
  })

  describe('import from REDIS commands', function() {

    it('import strings with SET', function(done) {
      const dataStr = 'SET articles:1:desc "DESC"\n' +
        'SET articles:3:desc "DESC"\n' +
        'SET articles:3:name "Postgres article!"\n' +
        'SET articles:1:name "First tutorial for nodejs"\n' +
        'SET articles:2:desc "DESC"';

      dump.import({
        type: 'redis',
        data: dataStr,
        clear: true,
        callback: function(err, report) {
          expect(err, 'error should not be set').to.be.undefined;
          expect(report).to.deep.equal({inserted: 5, errors: 0});
          // now check redis "server" data
          expect(redis.data.keys()).to.have.length(5);
          done();
        }
      });
    })

    it('import sorted set with ZADD', function(done) {
      const dataStr = 'ZADD rubrics:3:_:relations:articles 1378911643410 "1"\n' +
        'ZADD rubrics:3:_:relations:articles 1378913150937 "2"\n' +
        'ZADD articles:_:lists:all 1378911643410 "1"\n' +
        'ZADD articles:_:lists:all 1378913150937 "2"\n' +
        'ZADD articles:_:lists:all 1378913165465 "3"';

      dump.import({
        type: 'redis',
        data: dataStr,
        clear: true,
        callback: function(err, report) {
          expect(err, 'error should not be set').to.be.undefined;
          // 2 sorted lists with 2 and 3 items each
          expect(report).to.deep.equal({inserted: 5, errors: 0});
          // now check redis "server" data
          expect(redis.data.keys()).to.have.length(2);
          done();
        }
      });
    })

    it('import set with SADD', function(done) {
      const dataStr =     'SADD articles:1:_:relations:rubrics "1"\n' +
        'SADD articles:1:_:relations:rubrics "3"\n' +
        'SADD articles:2:_:relations:rubrics "1"\n' +
        'SADD articles:2:_:relations:rubrics "3"\n' +
        'SADD articles:2:_:relations:rubrics "5"';

      dump.import({
        type: 'redis',
        data: dataStr,
        clear: true,
        callback: function(err, report) {
          expect(err, 'error should not be set').to.be.undefined;
          // 2 lists with 2 and 3 items each
          expect(report).to.deep.equal({inserted: 5, errors: 0});
          // now check redis "server" data
          expect(redis.data.keys()).to.have.length(2);
          done();
        }
      });
    })

    it('import hash with HSET', function(done) {
      const dataStr = 'HSET "hashobj:1" "hashkey" "hashvalue"' +
        'HSET "hashobj:1" "key2" "val"' +
        'HSET "hashobj:2" "key" "val"';

      dump.import({
        type: 'redis',
        data: dataStr,
        clear: true,
        callback: function(err, report) {
          expect(err, 'error should not be set').to.be.undefined;
          // 2 hashes with 1 or 2 fields each
          expect(report).to.deep.equal({inserted: 3, errors: 0});
          // now check redis "server" data
          expect(redis.data.keys()).to.have.length(2);
          done();
        }
      });
    })

    it('import without cleaning db before', function(done) {
      const dataStr1 =   'SET articles:1:desc "DESC"\n' +
        'SET articles:3:desc "DESC"';
      const dataStr2 = 'SET articles:3:name "Postgres article!"\n' +
        'SET articles:1:name "First tutorial for nodejs"\n' +
        'SET articles:2:desc "DESC"';

      // first import clearing db
      dump.import({
        type: 'redis',
        data: dataStr1,
        clear: true,
        callback: function(err, report) {
          expect(err, 'error on first import should not be set').to.be.undefined;
          expect(report).to.deep.equal({inserted: 2, errors: 0});
          // now check redis "server" data
          expect(redis.data.keys()).to.have.length(2);

          // second import without clearing db
          dump.import({
            type: 'redis',
            data: dataStr2,
            clear: false,
            callback: function(err, report) {
              expect(err, 'error on second import should not be set').to.be.undefined;
              expect(report).to.deep.equal({inserted: 3, errors: 0});
              // now check redis "server" data
              expect(redis.data.keys()).to.have.length(5);
              done();
            }
          });
        }
      });
    })

  })
})
