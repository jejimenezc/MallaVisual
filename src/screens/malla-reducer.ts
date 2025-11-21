import type { CurricularPiece, MasterBlockData } from '../types/curricular';
import type { ProjectTheme } from '../utils/malla-io';
import type { StoredBlock } from '../utils/block-repo';

export interface MallaState {
    cols: number;
    rows: number;
    pieces: CurricularPiece[];
    pieceValues: Record<string, Record<string, string | number | boolean>>;
    floatingPieces: string[];
    mastersById: Record<string, MasterBlockData>;
    selectedMasterId: string;
    theme: ProjectTheme;
    // UI State that doesn't need history can be kept separate or here if we want to persist it?
    // Usually UI state like "zoom" or "pointerMode" is ephemeral.
    // We will keep core data here.
}

export type MallaAction =
    | { type: 'SET_GRID_SIZE'; cols?: number; rows?: number }
    | { type: 'ADD_PIECE'; piece: CurricularPiece }
    | { type: 'REMOVE_PIECE'; id: string }
    | { type: 'UPDATE_PIECE'; piece: CurricularPiece } // For moves/resizes
    | { type: 'SET_PIECES'; pieces: CurricularPiece[] } // Bulk update
    | { type: 'UPDATE_PIECE_VALUE'; pieceId: string; key: string; value: string | number | boolean }
    | { type: 'SET_PIECE_VALUES'; values: Record<string, Record<string, string | number | boolean>> }
    | { type: 'SET_FLOATING_PIECES'; ids: string[] }
    | { type: 'SET_MASTERS'; masters: Record<string, MasterBlockData> }
    | { type: 'SELECT_MASTER'; id: string }
    | { type: 'SET_THEME'; theme: ProjectTheme }
    | { type: 'LOAD_STATE'; state: Partial<MallaState> } // For history/init
    | { type: 'CLEAR_GRID' }
    | { type: 'INSERT_ROW'; index: number }
    | { type: 'REMOVE_ROW'; index: number }
    | { type: 'INSERT_COL'; index: number }
    | { type: 'REMOVE_COL'; index: number }
    | { type: 'BATCH'; actions: MallaAction[] };

export const mallaReducer = (state: MallaState, action: MallaAction): MallaState => {
    switch (action.type) {
        case 'SET_GRID_SIZE':
            return {
                ...state,
                cols: action.cols ?? state.cols,
                rows: action.rows ?? state.rows,
            };
        case 'ADD_PIECE':
            return {
                ...state,
                pieces: [...state.pieces, action.piece],
                floatingPieces: [...state.floatingPieces, action.piece.id],
            };
        case 'REMOVE_PIECE': {
            const nextValues = { ...state.pieceValues };
            delete nextValues[action.id];
            return {
                ...state,
                pieces: state.pieces.filter((p) => p.id !== action.id),
                floatingPieces: state.floatingPieces.filter((id) => id !== action.id),
                pieceValues: nextValues,
            };
        }
        case 'UPDATE_PIECE':
            return {
                ...state,
                pieces: state.pieces.map((p) => (p.id === action.piece.id ? action.piece : p)),
            };
        case 'SET_PIECES':
            return {
                ...state,
                pieces: action.pieces,
            };
        case 'UPDATE_PIECE_VALUE':
            return {
                ...state,
                pieceValues: {
                    ...state.pieceValues,
                    [action.pieceId]: {
                        ...(state.pieceValues[action.pieceId] ?? {}),
                        [action.key]: action.value,
                    },
                },
            };
        case 'SET_PIECE_VALUES':
            return {
                ...state,
                pieceValues: action.values,
            };
        case 'SET_FLOATING_PIECES':
            return {
                ...state,
                floatingPieces: action.ids,
            };
        case 'SET_MASTERS':
            return {
                ...state,
                mastersById: action.masters,
            };
        case 'SELECT_MASTER':
            return {
                ...state,
                selectedMasterId: action.id,
            };
        case 'SET_THEME':
            return {
                ...state,
                theme: action.theme,
            };
        case 'LOAD_STATE':
            return {
                ...state,
                ...action.state,
            };
        case 'CLEAR_GRID':
            return {
                ...state,
                pieces: [],
                pieceValues: {},
                floatingPieces: [],
            };
        case 'INSERT_ROW': {
            const targetIndex = action.index;
            return {
                ...state,
                rows: state.rows + 1,
                pieces: state.pieces.map((piece) => (piece.y >= targetIndex ? { ...piece, y: piece.y + 1 } : piece)),
            };
        }
        case 'REMOVE_ROW': {
            const targetIndex = action.index;
            if (state.rows <= 1) return state;
            return {
                ...state,
                rows: Math.max(1, state.rows - 1),
                pieces: state.pieces.map((piece) => (piece.y > targetIndex ? { ...piece, y: piece.y - 1 } : piece)),
            };
        }
        case 'INSERT_COL': {
            const targetIndex = action.index;
            return {
                ...state,
                cols: state.cols + 1,
                pieces: state.pieces.map((piece) => (piece.x >= targetIndex ? { ...piece, x: piece.x + 1 } : piece)),
            };
        }
        case 'REMOVE_COL': {
            const targetIndex = action.index;
            if (state.cols <= 1) return state;
            return {
                ...state,
                cols: Math.max(1, state.cols - 1),
                pieces: state.pieces.map((piece) => (piece.x > targetIndex ? { ...piece, x: piece.x - 1 } : piece)),
            };
        }
        case 'BATCH':
            return action.actions.reduce(mallaReducer, state);
        default:
            return state;
    }
};
