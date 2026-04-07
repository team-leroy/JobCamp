import { MAX_PICKS } from '$lib/appconfig';

export class PickLimitExceededError extends Error {
    constructor() {
        super(`You may only select up to ${MAX_PICKS} positions.`);
    }
}

/**
 * Applies a toggle to a student's position pick list.
 * Returns the new ordered list of positionIds after toggling posId in or out.
 * Throws PickLimitExceededError if adding posId would exceed MAX_PICKS.
 */
export function applyPickToggle(currentPickIds: string[], posId: string): string[] {
    const withoutPos = currentPickIds.filter(id => id !== posId);
    const isRemoving = withoutPos.length < currentPickIds.length;

    if (isRemoving) {
        return withoutPos;
    }

    if (currentPickIds.length >= MAX_PICKS) {
        throw new PickLimitExceededError();
    }

    return [...currentPickIds, posId];
}
