/* jshint expr:true */
/* global describe, beforeEach, it */
'use strict';

var FSM   = require('../lib/fsm');
var chai  = require('chai');
var spies = require('chai-spies');

chai.use(spies);

var assert = chai.assert;
var expect = chai.expect;

describe('FSM', function() {
  describe('#validate', function() {
    it('should fail if defs is not an object', function() {
      assert.throws(FSM.validate.bind(undefined, 'hello'), Error);
    });

    it('should fail if a state is not an object', function() {
      var states = {
        INITIALIZING : 'hello'
      };

      assert.throws(FSM.validate.bind(undefined, states), Error);
    });

    it('should fail if a state has no name', function() {
      var states = {
        INITIALIZING : {}
      };

      assert.throws(FSM.validate.bind(undefined, states), Error);
    });

    it('should fail if state enter exists but is not a function', function() {
      var states = {
        INITIALIZING : {
          name : 'Initializing'
        },
        CONNECTING : {
          name  : 'Connecting',
          enter : 'hello'
        }
      };

      assert.throws(FSM.validate.bind(undefined, states), Error);
    });

    it('should fail if state exit exists but is not a function', function() {
      var states = {
        INITIALIZING : {
          name : 'Initializing'
        },
        CONNECTING : {
          name : 'Connecting',
          exit : 'hello'
        }
      };

      assert.throws(FSM.validate.bind(undefined, states), Error);
    });

    it('should fail if state events exists but is not an object', function() {
      var states = {
        INITIALIZING : {
          name : 'Initializing'
        },
        CONNECTING : {
          name   : 'Connecting',
          events : 'hello'
        }
      };

      assert.throws(FSM.validate.bind(undefined, states), Error);
    });

    it('should fail if state events contains a non-function', function() {
      var states = {
        INITIALIZING : {
          name : 'Initializing'
        },
        CONNECTING : {
          name  : 'Connecting',
          events : {
            event1 : function() {},
            event2 : 123
          }
        }
      };

      assert.throws(FSM.validate.bind(undefined, states), Error);
    });
  });

  describe('#constructor', function() {
    it('should set the given state definitions into the instance', function() {

      var states = {
        initializing : {
          name : 'Initializing'
        }
      };

      var fsm = new FSM(states);

      assert.equal(states, fsm.STATE);
    });
  });

  describe('#transitionTo', function() {
    var fsm;

    beforeEach(function() {
      fsm = new FSM({
        INITIALIZING : {
          name : 'Initializing',
        },
        CONNECTING : {
          name : 'Connecting',
          enter : function() {
            this.emit('connecting');
          }
        }
      });
    });

    it('can transition into an initial state from no state', function() {
      fsm.transitionTo(fsm.STATE.INITIALIZING);

      assert.equal(fsm.STATE.INITIALIZING, fsm.state);
    });

    it('should emit debug events when changing state', function() {
      var spy = chai.spy();

      fsm.on('debug', spy);

      fsm.transitionTo(fsm.STATE.INITIALIZING);
      expect(spy).to.have.been.called.once;

      fsm.transitionTo(fsm.STATE.CONNECTING);
      expect(spy).to.have.been.called.twice;
    });

    it('should emit a debug event when changing to the same state', function() {
      var spy = chai.spy();

      fsm.on('debug', spy);

      fsm.transitionTo(fsm.STATE.INITIALIZING);
      expect(spy).to.have.been.called.once;

      fsm.transitionTo(fsm.STATE.INITIALIZING);
      expect(spy).to.have.been.called.with('State is already Initializing');
    });

    it('should trigger enter and exit events when states have them', function() {
      /* jshint maxstatements:false */
      var onTransition = chai.spy();

      var initEnter = chai.spy();
      var initExit  = chai.spy();

      var connectEnter = chai.spy();
      var connectExit  = chai.spy();

      fsm = new FSM({
        INITIALIZING : {
          name  : 'Initializing',
          enter : initEnter,
          exit  : initExit
        },
        CONNECTING : {
          name  : 'Connecting',
          enter : connectEnter,
          exit  : connectExit
        }
      });

      fsm.on('transition', onTransition);

      expect(initEnter).to.have.been.called.exactly(0);
      expect(initExit).to.have.been.called.exactly(0);
      expect(connectEnter).to.have.been.called.exactly(0);
      expect(connectExit).to.have.been.called.exactly(0);
      expect(onTransition).to.have.been.called.exactly(0);

      fsm.transitionTo(fsm.STATE.INITIALIZING);
      expect(initEnter).to.have.been.called.once;
      expect(initExit).to.have.been.called.exactly(0);
      expect(connectEnter).to.have.been.called.exactly(0);
      expect(connectExit).to.have.been.called.exactly(0);
      expect(onTransition).to.have.been.called.once;

      fsm.transitionTo(fsm.STATE.INITIALIZING);
      expect(initEnter).to.have.been.called.once;
      expect(initExit).to.have.been.called.exactly(0);
      expect(connectEnter).to.have.been.called.exactly(0);
      expect(connectExit).to.have.been.called.exactly(0);

      fsm.transitionTo(fsm.STATE.CONNECTING);
      expect(initEnter).to.have.been.called.once;
      expect(initExit).to.have.been.called.once;
      expect(connectEnter).to.have.been.called.once;
      expect(connectExit).to.have.been.called.exactly(0);
      expect(onTransition).to.have.been.called.twice;
    });
  });

  describe('#dispatchEvent', function() {
    it('should trigger events with the correct arguments when called', function() {
      var onInitReady = chai.spy();

      var fsm = new FSM({
        INITIALIZING : {
          name  : 'Initializing',
          events : {
            onInitReady : onInitReady
          }
        }
      });

      fsm.transitionTo(fsm.STATE.INITIALIZING);

      fsm.dispatchEvent('onInitReady', 'arg1', 'arg2');
      expect(onInitReady).to.have.been.called.with('arg1');
      expect(onInitReady).to.have.been.called.with('arg2');


      fsm.dispatchEvent('onInitReady', 'arg3');
      expect(onInitReady).to.have.been.called.with('arg3');

    });

    it('should emit an error if no such event exists in the current state', function() {
      var onError = chai.spy();

      var fsm = new FSM({
        INITIALIZING : {
          name  : 'Initializing'
        }
      });

      fsm.on('error', onError);

      fsm.transitionTo(fsm.STATE.INITIALIZING);

      fsm.dispatchEvent('onInitReady', 'arg1', 'arg2');
      expect(onError).to.have.been.called.once;

    });
  });
});
