// @ts-check

/**
 * @template T
 * @typedef {[() => T, (value: T) => void]} Signal
 */

/**
 * @template T
 * @typedef {(() => T | undefined) & { loading: boolean, error: Error | undefined }} Resource
 */

export { createSignal, createResource, createEffect, createMemo } from 'https://esm.sh/solid-js';
export { render } from 'https://esm.sh/solid-js/web';
export { default as html } from 'https://esm.sh/solid-js/html';
