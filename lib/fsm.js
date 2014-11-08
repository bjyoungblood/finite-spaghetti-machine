'use strict';

var _            = require('lodash');
var util         = require('util');
var assert       = require('assert');
var EventEmitter = require('events').EventEmitter;

function FiniteStateMachine(defs) {
  FiniteStateMachine.validate(defs);

  _.each(defs, function(state, stateName) {
    if (defs[stateName].enter) {
      defs[stateName].enter = defs[stateName].enter.bind(this);
    }

    if (defs[stateName].exit) {
      defs[stateName].exit = defs[stateName].exit.bind(this);
    }

    if (defs[stateName].events) {
      _.each(defs[stateName].events, function(event, eventName) {
        defs[stateName].events[eventName] = event.bind(this);
      }, this);
    }
  }, this);

  EventEmitter.call(this);

  this.STATE = defs;

  this.state = {};
}

FiniteStateMachine.validate = function(defs) {
  assert(_.isObject(defs), 'State definitions must be an object');

  _.each(defs, function(state, stateKey) {
    assert(_.isObject(state), 'State must be an object');
    assert(_.isString(state.name), 'State must have a name');

    if (state.enter) {
      assert(_.isFunction(state.enter), 'Enter state must be a function if provided');
    }

    if (state.exit) {
      assert(_.isFunction(state.exit), 'Exit state must be a function if provided');
    }

    if (state.events) {
      assert(_.isObject(state.events), 'State events must be an object if provided');
      _.each(state.events, function(eventFn) {
        assert(_.isFunction(eventFn), 'State event handler must be a function');
      });
    }
  });

  return true;
};

util.inherits(FiniteStateMachine, EventEmitter);

FiniteStateMachine.prototype._preTransition = function(newState) {
  if (this.state === newState) {
    this.emit('debug', util.format('State is already %s', newState.name));
    return false;
  }

  if (this.state.exit) {
    this.state.exit.apply(this);
  }

  return true;
};

FiniteStateMachine.prototype.transitionTo = function(newState) {

  if (this.state) {
    if (! this._preTransition(newState)) {
      return false;
    }
  }

  this.emit('debug', util.format(
    'State change: %s -> %s',
    this.state.name,
    newState.name
  ));

  this.emit('transition', this.state, newState);
  this.state = newState;

  if (this.state.enter) {
    this.state.enter.apply(this);
  }
};

FiniteStateMachine.prototype.dispatchEvent = function(eventName) {
  var args = _.rest(arguments);
  if (this.state.events && this.state.events[eventName]) {
    this.state.events[eventName].apply(this, args);
  } else {
    this.emit('error', new Error(util.format(
      'No event \'%s\' in state \'%s\'',
      eventName, this.state.name
    )));
  }
};

module.exports = FiniteStateMachine;
