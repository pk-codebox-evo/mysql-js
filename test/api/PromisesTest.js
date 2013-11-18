/*
 Copyright (c) 2013, Oracle and/or its affiliates. All rights
 reserved.
 
 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; version 2 of
 the License.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 02110-1301  USA
 */

"use strict";

var good_properties = global.test_conn_properties;

var bad_properties = {
  "implementation"    : global.test_conn_properties.implementation,
  "mysql_host"        : "localhost",
  "mysql_port"        : "3306",
  "mysql_user"        : "_BAD_USER_",
  "mysql_password"    : "_NOT_A_REAL_PASSWORD!_", 
  "ndb_connectstring" : "this_host_does_not_exist"
}

var tests = [];

/* 2.2.2 if onFulfilled is a function:
     2.2.2.1 it must be called after promise is fulfilled, with promise's value
             as its first argument.
     2.2.2.2 it must not be called before promise is fulfilled
     2.2.2.3 it must not be called more than once.
*/
var t_222 = new harness.ConcurrentTest("2.2.2 onFulfilled");
t_222.run = function() {
  var n, p, test;
  n = 0;
  test = this;

  function onSession(session) {
    n++;
    assert(n === 1);  // 2.2.2.3 ; could happen after test has already passed
    test.errorIfUnset("PromisesTest.t_222 onFulfilled gets a value", session);   // 2.2.2.1
    test.errorIfNotEqual("PromisesTest.t_222 Not a session", typeof session.find, "function");
    test.errorIfNotEqual("typeof this (2.2.5) " + this, "undefined", typeof this);

    session.close(function() {
      test.failOnError();
      });
  }
  
  p = mynode.openSession(good_properties, null);
  if(typeof p === 'object' && typeof p.then === 'function') {
    p.then(onSession);
  } else {
    this.fail("PromisesTest.t_222 not thenable");
  }
};
tests.push(t_222);



/* 2.2.3 if onRejected is a function:
     2.2.3.1 it must be called after promise is rejected, with promise's reason
       as its first argument.
     2.2.3.2 it must not be called before promise is rejected
     2.2.3.3 it must not be called more than once. 
*/
var t_223 = new harness.ConcurrentTest("2.2.3 onRejected");
t_223.run = function() {
  var n, p, test;
  n = 0;
  test = this;
  
  function onSession(s) {
    assert("PromisesTest.t_223 openSession should fail" === 0);
    s.close();
  }
  
  function onError(e) {
    n++;
    assert(n === 1);   // 2.2.3.3 ; could happen after test has passed
    test.errorIfUnset("onRejected must get a reason", e);
    test.errorIfNotEqual("typeof this (2.2.5) " + this, "undefined", typeof this);
    test.failOnError();
  }
  
  p = mynode.openSession(bad_properties, null);
  if(typeof p === 'object' && typeof p.then === 'function') {
    p.then(onSession, onError);
  } else {
    this.fail("PromisesTest.t_223 not thenable");
  }
};
tests.push(t_223);


/*  2.2.6 then may be called multiple times on the same promise.
      2.2.6.1 If/when promise is fulfilled, all respective onFulfilled callbacks
              must execute in the order of their originating calls to then.
      2.2.6.2 If/when promise is rejected, all respective onRejected callbacks 
              must execute in the order of their originating calls to then.
*/
var t_2261 = new harness.ConcurrentTest("2.2.6.1 multiple onFulfilled called in order"); 
t_2261.run = function() {
  var n, p, test;
  n = 0;
  test = this;
  
  function onSession_1(s) {
    n++;
    test.errorIfNotEqual("PromisesTest.t_2261 wrong order; onSession_1 should be called first", 1, n);
  }

  function onSession_2(s) {
    n++;
    test.errorIfNotEqual("PromisesTest.t_2261 wrong order; onSession_2 should be called second", 2, n);
    s.close(function() { test.failOnError(); });
  }

  p = mynode.openSession(good_properties, null);
  if(typeof p === 'object' && typeof p.then === 'function') {
    p.then(onSession_1);
    p.then(onSession_2);
  } else {
    this.fail("PromisesTest.t_2261 not thenable");
  }  
};
tests.push(t_2261);

var t_2262 = new harness.ConcurrentTest("2.2.6.2 multiple onRejected called in order");
t_2262.run = function() {
  var n, p, test;
  n = 0;
  test = this;

  function onSession(s) {
    test.fail("PromisesTest.t_2262 openSession should fail");
    s.close();
  }

  function onErr_1(e) {
    n++;
    test.errorIfNotEqual("PromisesTest.t_2262 wrong order; onErr_1 should be called first", 1, n);
  }
  
  function onErr_2(e) {
    n++;
    test.errorIfNotEqual("PromisesTest.t_2262 wrong order; onErr_2 should be called second", 2, n);
    test.failOnError();
  }

  p = mynode.openSession(bad_properties, null);
  if(typeof p === 'object') {
    p.then(onSession, onErr_1);
    p.then(onSession, onErr_2);
  } else {
    this.fail("PromisesTest.t_2262 not thenable");
  }
};
tests.push(t_2262);


/* 2.2.7 "then" must return a promise
*/
var t_227 = new harness.ConcurrentTest("2.2.7 then returns a promise"); 
t_227.run = function() {
  var p1, p2, test;
  test = this;
  
  function onSession(s) {
    s.close(function() { test.failOnError(); });
  }

  p1 = mynode.openSession(good_properties, null);
  if(typeof p1 !== 'object' || typeof p1.then !== 'function') {
    this.fail("PromisesTest.t_227 p1 not thenable");
  } else {
    p2 = p1.then(onSession);
    if(typeof p2 !== 'object' || typeof p2.then !== 'function') {
      this.appendErrorMessage("PromisesTest.t_227 p2 not thenable");
    }
  }
};
tests.push(t_227);

/* 2.2.7.1 If onFulfilled returns a value x, run the Promise Resolution Procedure.
 */
var t_2271fv = new harness.ConcurrentTest("2.2.7.1 onFulfilled returns a value"); 
t_2271fv.run = function() {
  var p1, p2 ,p3, test, session;
  test = this;
  
  function onSession(s) {
    // onFulfilled returns a value; should fulfill p3 as well
    s.close();
    return 49;
  }

  function onP2Fulfilled(v) {
    test.errorIfNotEqual("t_2271fv onP2Fulfilled value", 49, v);
    test.failOnError();
  }

  p1 = mynode.openSession(good_properties, null);
  if(typeof p1 !== 'object' || typeof p1.then !== 'function') {
    this.fail("PromisesTest.t_227 p1 not thenable");
  } else {
    p2 = p1.then(onSession);
    if(typeof p2 !== 'object' || typeof p2.then !== 'function') {
      this.appendErrorMessage("PromisesTest.t_2271 p2 not thenable");
    }
    p3 = p2.then(onP2Fulfilled);
  }
};
tests.push(t_2271fv);

/* 2.2.7.1 If onRejected returns a value x, run the Promise Resolution Procedure.
 */
var t_2271rv = new harness.ConcurrentTest("2.2.7.1 onRejected returns a value"); 
t_2271rv.run = function() {
  var p1, p2 ,p3, test, session, onSession;
  test = this;
  
  function onError(err) {
    // onError returns a value; should fulfill p3 as well
    return 49;
  }

  function onP2Fulfilled(v) {
    test.errorIfNotEqual("t_2271rv onP2Rejected value", 49, v);
    test.failOnError();
  }

  function onP2Rejected(e) {
    test.fail('t_2271rv should not reject because onRejected returned a value.');
  }

  p1 = mynode.openSession(bad_properties, null);
  p1.name = 'p1';
  if(typeof p1 !== 'object' || typeof p1.then !== 'function') {
    this.fail("PromisesTest.t_227 p1 not thenable");
  } else {
    p2 = p1.then(onSession, onError);
    p2.name = 'p2';
    if(typeof p2 !== 'object' || typeof p2.then !== 'function') {
      this.appendErrorMessage("PromisesTest.t_2271 p2 not thenable");
    }
    // p3 tests for the result of p2
    p3 = p2.then(onP2Fulfilled, onP2Rejected);
    p3.name = 'p3';
  }
};
tests.push(t_2271rv);


/* 2.2.7.2 If onFulfilled throws an exception e, promise2 must be rejected with e as the reason. 
 */
var t_2272fe = new harness.ConcurrentTest("2.2.7.2 onFulfilled throws an error"); 
t_2272fe.run = function() {
  var p1, p2, p3, test, p2OnFulfilled;
  test = this;
  
  function onSession(s) {
    // onSession throws an exception; should reject p2
    s.close();
    throw new Error("PromisesTest.t_2272fe");
  }

  function p2OnRejected(e) {
    test.errorIfNotEqual('t_2272fe error value', 'PromisesTest.t_2272fe', e.message);
    test.failOnError();
  }

  p1 = mynode.openSession(good_properties, null);
  if(typeof p1 !== 'object' || typeof p1.then !== 'function') {
    this.fail("PromisesTest.t_2272fe p1 not thenable");
  } else {
    p2 = p1.then(onSession);
    if(typeof p2 !== 'object' || typeof p2.then !== 'function') {
      this.appendErrorMessage("PromisesTest.t_2271fe p2 not thenable");
    }
    p3 = p2.then(p2OnFulfilled, p2OnRejected);
  }
};
tests.push(t_2272fe);

/* 2.2.7.2 If onRejected throws an exception e, promise2 must be rejected with e as the reason. 
 */
var t_2272re = new harness.ConcurrentTest("2.2.7.2 onRejected throws an error"); 
t_2272re.run = function() {
  var p1, p2, p3, test, onSession, p2OnFulfilled;
  test = this;
  
  function onError(err) {
    // onError throws an exception; should reject p2
    throw new Error("PromisesTest.t_2272re");
  }

  function p2OnRejected(e) {
    test.errorIfNotEqual('t_2272re error value', 'PromisesTest.t_2272re', e.message);
    test.failOnError();
  }

  p1 = mynode.openSession(bad_properties, null);
  if(typeof p1 !== 'object' || typeof p1.then !== 'function') {
    this.fail("PromisesTest.t_2272re p1 not thenable");
  } else {
    p2 = p1.then(onSession, onError);
    if(typeof p2 !== 'object' || typeof p2.then !== 'function') {
      this.appendErrorMessage("PromisesTest.t_227 p2 not thenable");
    }
    p3 = p2.then(p2OnFulfilled, p2OnRejected);
  }
};
tests.push(t_2272re);

/* 2.2.7.3 If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value.
 */
var t_2273 = new harness.ConcurrentTest("2.2.7.3 missing onFulfilled"); 
t_2273.run = function() {
  var p1, p2, p3, test;
  test = this;
  
  function p2OnFulfilled(v) {
    v.close(function(){test.failOnError()});
  }

  p1 = mynode.openSession(good_properties, null);
  if(typeof p1 !== 'object' || typeof p1.then !== 'function') {
    this.fail("PromisesTest.t_2273 p1 not thenable");
  } else {
    p2 = p1.then();
    if(typeof p2 !== 'object' || typeof p2.then !== 'function') {
      this.appendErrorMessage("PromisesTest.t_2273 p2 not thenable");
    }
    p3 = p2.then(p2OnFulfilled);
  }
};
tests.push(t_2273);

/* 2.2.7.4 If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same reason.
 */
var t_2274 = new harness.ConcurrentTest("2.2.7.4 missing onRejected"); 
t_2274.run = function() {
  var p1, p2, p3, test, p2OnFulfilled;
  test = this;

  function p2OnRejected(err) {
    test.failOnError();
  }

  p1 = mynode.openSession(bad_properties, null);
  if(typeof p1 !== 'object' || typeof p1.then !== 'function') {
    this.fail("PromisesTest.t_227 p1 not thenable");
  } else {
    p2 = p1.then();
    if(typeof p2 !== 'object' || typeof p2.then !== 'function') {
      this.appendErrorMessage("PromisesTest.t_227 p2 not thenable");
    }
    p3 = p2.then(p2OnFulfilled, p2OnRejected);
  }
};
tests.push(t_2274);

module.exports.tests = tests;
