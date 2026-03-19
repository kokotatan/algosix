/**
 * アニメーションに関する汎用ユーティリティ
 */

/**
 * カードなどの要素に一時的なアニメーションクラスを付与する
 * @param {Function} setAnims - state setter (例: setCardAnims)
 * @param {string} key - 要素の識別子 (例: "0-1", "0-new")
 * @param {string} animClass - 適用する CSS クラス名
 * @param {number} duration - クラスを外すまでの時間(ms)
 */
export function triggerCardAnim(setAnims, key, animClass, duration = 600) {
  // アニメーションクラスを付与
  setAnims((prev) => ({ ...prev, [key]: animClass }));
  
  // 指定時間後にクラスを外す
  setTimeout(() => {
    setAnims((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, duration);
}
