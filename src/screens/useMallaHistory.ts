import { useReducer, useCallback, useRef, useMemo } from 'react';
import { mallaReducer, type MallaState, type MallaAction } from './malla-reducer';

// Helper to deep clone state for history snapshots
// Using JSON parse/stringify as fallback, but structuredClone is preferred
const cloneState = <T>(state: T): T => {
    if (typeof structuredClone === 'function') {
        return structuredClone(state);
    }
    return JSON.parse(JSON.stringify(state));
};

export const useMallaHistory = (initialState: MallaState) => {
    // Internal reducer for current state
    const [state, dispatch] = useReducer(mallaReducer, initialState);

    // Keep a ref to state to access it in callbacks without dependencies
    const stateRef = useRef(state);
    useMemo(() => {
        stateRef.current = state;
    }, [state]);

    // History stacks
    const historyRef = useRef<MallaState[]>([]);
    const futureRef = useRef<MallaState[]>([]);

    const canUndo = historyRef.current.length > 0;
    const canRedo = futureRef.current.length > 0;

    const pushHistory = useCallback(() => {
        // Push CURRENT state (from ref) to history
        historyRef.current.push(cloneState(stateRef.current));
        // Clear future
        futureRef.current = [];
    }, []); // Stable dependency

    const undo = useCallback(() => {
        if (historyRef.current.length === 0) return;

        const previous = historyRef.current.pop()!;

        // Push current to future
        futureRef.current.push(cloneState(stateRef.current));

        // Restore previous
        dispatch({ type: 'LOAD_STATE', state: previous });
    }, []); // Stable dependency

    const redo = useCallback(() => {
        if (futureRef.current.length === 0) return;

        const next = futureRef.current.pop()!;

        // Push current to history
        historyRef.current.push(cloneState(stateRef.current));

        // Restore next
        dispatch({ type: 'LOAD_STATE', state: next });
    }, []); // Stable dependency

    // Wrapper for dispatch that optionally records history
    const dispatchWithHistory = useCallback((action: MallaAction, recordHistory = true) => {
        if (recordHistory && action.type !== 'LOAD_STATE') {
            // Only record for mutations. 
            pushHistory();
        }
        dispatch(action);
    }, [pushHistory]); // Stable dependency

    return {
        state,
        dispatch: dispatchWithHistory,
        undo,
        redo,
        canUndo,
        canRedo,
        historyLength: historyRef.current.length
    };
};
