/**
 * undo-manager.js — JSON snapshot stack for undo/redo
 */
const UndoManager = (() => {
  const MAX_STACK = 50;
  let undoStack = [];
  let redoStack = [];
  let getStateFn = null;
  let restoreStateFn = null;

  function init(getState, restoreState) {
    getStateFn = getState;
    restoreStateFn = restoreState;
    undoStack = [];
    redoStack = [];
  }

  /** Take a snapshot of current state before a change */
  function snapshot() {
    if (!getStateFn) return;
    const state = getStateFn();
    if (!state) return;
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > MAX_STACK) undoStack.shift();
    // New action clears redo
    redoStack = [];
    EventBus.emit('undo:changed', { canUndo: canUndo(), canRedo: canRedo() });
  }

  function undo() {
    if (!canUndo() || !getStateFn || !restoreStateFn) return false;
    // Save current state to redo
    redoStack.push(JSON.stringify(getStateFn()));
    // Restore previous state
    const prev = JSON.parse(undoStack.pop());
    restoreStateFn(prev);
    EventBus.emit('undo', prev);
    EventBus.emit('undo:changed', { canUndo: canUndo(), canRedo: canRedo() });
    return true;
  }

  function redo() {
    if (!canRedo() || !getStateFn || !restoreStateFn) return false;
    // Save current to undo
    undoStack.push(JSON.stringify(getStateFn()));
    // Restore redo state
    const next = JSON.parse(redoStack.pop());
    restoreStateFn(next);
    EventBus.emit('redo', next);
    EventBus.emit('undo:changed', { canUndo: canUndo(), canRedo: canRedo() });
    return true;
  }

  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }

  function clear() {
    undoStack = [];
    redoStack = [];
    EventBus.emit('undo:changed', { canUndo: false, canRedo: false });
  }

  return { init, snapshot, undo, redo, canUndo, canRedo, clear };
})();
