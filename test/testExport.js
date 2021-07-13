/* eslint-disable padded-blocks */
'use strict';

const {expect} = require('chai');
const Redis = require('ioredis-mock');
const RedisDump = require('../lib/node-redis-dump');

describe('Test file export function', function() {

  const redisData = {
    'string': 'aaa',
    'string:1': 'bbb',
    'string:2': 'ccc',
    'list:1': ['a', 'b', 'c'],
    'list:2': ['x'],
    'hash:1': {
      'key1': 'a',
      'key2': 'b',
    },
    'hash:2': {
      'key1': 'x',
      'key2': 'y'
    }
  };
  let dump;

  beforeEach(function() {
    const redis = new Redis({
      data: redisData
    });
    dump = new RedisDump({client: redis});
  });

  describe('export as REDIS strings', function() {

    it('export subpath of strings (1)', function(done) {
      const keyPrefix = 'string';
      const expectData = Object.keys(redisData).filter((k) => {
        return k.startsWith(keyPrefix);
      }).map((k) => {
        return `SET "${k}" "${redisData[k]}"`;
      }).reverse();

      dump.export({
        type: 'redis',
        keyPrefix: keyPrefix,
        callback: function(err, data) {
          expect(err, 'error should not be set').to.be.null;
          expect(data).to.be.a('string');
          // split, as its closing with trailing line-feed and remove last array entry
          const dataArr = data.split('\n');
          if (dataArr[dataArr.length-1] === '') dataArr.pop();

          expect(dataArr).to.have.length(expectData.length);
          expect(dataArr).to.deep.equal(expectData);
          done();
        }
      });
    });

    it('export subpath of strings (2)', function(done) {
      const keyPrefix = 'string:';
      const expectData = Object.keys(redisData).filter((k) => {
        return k.startsWith(keyPrefix);
      }).map((k) => {
        return `SET "${k}" "${redisData[k]}"`;
      }).reverse();

      dump.export({
        type: 'redis',
        keyPrefix: keyPrefix,
        callback: function(err, data) {
          expect(err, 'error should not be set').to.be.null;
          expect(data).to.be.a('string');
          // split, as its closing with trailing line-feed and remove last array entry
          const dataArr = data.split('\n');
          if (dataArr[dataArr.length-1] === '') dataArr.pop();

          expect(dataArr).to.have.length(expectData.length);
          expect(dataArr).to.deep.equal(expectData);
          done();
        }
      });
    });

    it('export subpath of list', function(done) {
      const keyPrefix = 'list';
      const expectData = Object.keys(redisData).filter((k) => {
        return k.startsWith(keyPrefix);
      }).map((k) => {
        return `RPUSH "${k}" "${redisData[k]}"`;
      }).reverse();

      dump.export({
        type: 'redis',
        keyPrefix: keyPrefix,
        callback: function(err, data) {
          expect(err, 'error should not be set').to.be.null;
          expect(data).to.be.a('string');
          // split, as its closing with trailing line-feed and remove last array entry
          const dataArr = data.split('\n');
          if (dataArr[dataArr.length-1] === '') dataArr.pop();

          expect(dataArr).to.have.length(expectData.length);
          expect(dataArr).to.deep.equal(expectData);
          done();
        }
      });
    });

    it('export subpath of hash', function(done) {
      const keyPrefix = 'hash';
      const expectData = Object.keys(redisData).filter((k) => {
        return k.startsWith(keyPrefix);
      }).map((k) => {
        return Object.keys(redisData[k]).map((field) => {
          return `HSET "${k}" "${field}" "${redisData[k][field]}"`;
        });
      }).reverse().flat();

      dump.export({
        type: 'redis',
        keyPrefix: keyPrefix,
        callback: function(err, data) {
          expect(err, 'error should not be set').to.be.null;
          expect(data).to.be.a('string');
          // split, as its closing with trailing line-feed and remove last array entry
          const dataArr = data.split('\n');
          if (dataArr[dataArr.length-1] === '') dataArr.pop();

          expect(dataArr).to.have.length(expectData.length);
          expect(dataArr).to.deep.equal(expectData);
          done();
        }
      });
    });

    it('export all', function(done) {
      // string and array produce one export command, hash one per field (=2 for each hash in this examples data)
      const expectCount = Object.keys(redisData).reduce((acc, k) => {
        if (typeof redisData[k] === 'string' || Array.isArray(redisData[k])) {
          return acc + 1;
        }
        return acc + Object.keys(redisData[k]).length;
      }, 0);

      dump.export({
        type: 'redis',
        callback: function(err, data) {
          expect(err, 'error should not be set').to.be.null;
          expect(data).to.be.a('string');
          // split, as its closing with trailing line-feed and remove last array entry
          const dataArr = data.split('\n');
          if (dataArr[dataArr.length-1] === '') dataArr.pop();

          expect(dataArr).to.have.length(expectCount);
          done();
        }
      });
    });
  });
});
