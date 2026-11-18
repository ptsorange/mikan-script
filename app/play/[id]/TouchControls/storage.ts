/* このブラウザ(localStorage)に、作品ごとのタッチ操作の設定を保存するときの名前 */

export const storageKey = (id: string) => `mikan-script-touch-controls:${id}`;
export const enabledStorageKey = (id: string) => `mikan-script-touch-controls-enabled:${id}`;
