import { describe, it, expect } from 'vitest';
import { mallaReducer, type MallaState, type MallaAction } from './malla-reducer';
import type { CurricularPiece } from '../types/curricular';

describe('mallaReducer', () => {
    const initialState: MallaState = {
        cols: 5,
        rows: 5,
        pieces: [],
        pieceValues: {},
        floatingPieces: [],
        mastersById: {},
        selectedMasterId: '',
        theme: {
            paletteId: null,
            tokens: {
                'palette.primary': '#000',
                'palette.secondary': '#fff',
                'spacing.unit': '4',
                'typography.fontFamily': 'sans-serif',
                'typography.fontSize': '16',
            }
        },
    };

    it('should handle SET_GRID_SIZE', () => {
        const action: MallaAction = { type: 'SET_GRID_SIZE', cols: 10, rows: 10 };
        const newState = mallaReducer(initialState, action);
        expect(newState.cols).toBe(10);
        expect(newState.rows).toBe(10);
    });

    it('should handle ADD_PIECE', () => {
        const piece: CurricularPiece = {
            kind: 'ref',
            id: 'p1',
            ref: { sourceId: 'm1', bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 }, aspect: '1/1' },
            x: 0,
            y: 0,
        };
        const action: MallaAction = { type: 'ADD_PIECE', piece };
        const newState = mallaReducer(initialState, action);
        expect(newState.pieces).toHaveLength(1);
        expect(newState.pieces[0]).toEqual(piece);
        expect(newState.floatingPieces).toContain('p1');
    });

    it('should handle REMOVE_PIECE', () => {
        const piece: CurricularPiece = {
            kind: 'ref',
            id: 'p1',
            ref: { sourceId: 'm1', bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 }, aspect: '1/1' },
            x: 0,
            y: 0,
        };
        const stateWithPiece = {
            ...initialState,
            pieces: [piece],
            floatingPieces: ['p1'],
            pieceValues: { p1: { val: 1 } }
        };

        const action: MallaAction = { type: 'REMOVE_PIECE', id: 'p1' };
        const newState = mallaReducer(stateWithPiece, action);
        expect(newState.pieces).toHaveLength(0);
        expect(newState.floatingPieces).toHaveLength(0);
        expect(newState.pieceValues['p1']).toBeUndefined();
    });

    it('should handle UPDATE_PIECE_VALUE', () => {
        const action: MallaAction = { type: 'UPDATE_PIECE_VALUE', pieceId: 'p1', key: 'foo', value: 'bar' };
        const newState = mallaReducer(initialState, action);
        expect(newState.pieceValues['p1']).toEqual({ foo: 'bar' });

        // Update existing
        const action2: MallaAction = { type: 'UPDATE_PIECE_VALUE', pieceId: 'p1', key: 'foo', value: 'baz' };
        const newState2 = mallaReducer(newState, action2);
        expect(newState2.pieceValues['p1']).toEqual({ foo: 'baz' });
    });
    it('should handle BATCH actions', () => {
        const action: MallaAction = {
            type: 'BATCH',
            actions: [
                { type: 'SET_GRID_SIZE', cols: 10, rows: 10 },
                { type: 'UPDATE_PIECE_VALUE', pieceId: 'p1', key: 'foo', value: 'bar' }
            ]
        };
        const newState = mallaReducer(initialState, action);
        expect(newState.cols).toBe(10);
        expect(newState.rows).toBe(10);
        expect(newState.pieceValues['p1']).toEqual({ foo: 'bar' });
    });
});
