// index.js

import { applyBasicLogic } from "./solver_inference/base.js";
import { applySubsetLogic } from "./solver_inference/set.js";
import { applyPatternLogic } from "./solver_inference/understood.js";

export function solverStep(board, rows, cols, openCell, flagCell) {
    let changed = false;

    changed |= applyBasicLogic(board, rows, cols, openCell, flagCell);
    changed |= applySubsetLogic(board, rows, cols, openCell, flagCell);
    changed |= applyPatternLogic(board, rows, cols, openCell, flagCell);

    return changed;
}
