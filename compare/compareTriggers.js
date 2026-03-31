// compare/compareTriggers.js

const { pushLog } = require("./compareState");
const { resolveEvent } = require("./compareResolver");

function emitEvent(battleState, event) {
  if (!event || !event.type) {
    throw new Error("emitEvent requires an event with a type");
  }

  battleState.queue.push(event);

  if (battleState.options.verboseLog) {
    pushLog(battleState, {
      kind: "event_queued",
      eventType: event.type,
      source: event.source ?? null,
      target: event.target ?? null
    });
  }
}

function processQueue(battleState) {
  while (battleState.queue.length > 0 && !battleState.winner) {
    const event = battleState.queue.shift();

    if (battleState.options.verboseLog) {
      pushLog(battleState, {
        kind: "event_resolving",
        eventType: event.type,
        source: event.source ?? null,
        target: event.target ?? null
      });
    }

    resolveEvent(battleState, event);
  }
}

module.exports = {
  emitEvent,
  processQueue
};
