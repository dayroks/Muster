/*!
 * Muster SDK — автоматичне хмарне збереження для міні-апів.
 * Підключення (одним рядком, якомога раніше в <head>):
 *   <script src="https://YOUR-MUSTER-DOMAIN/muster-sdk.js"></script>
 * Далі гра зберігає прогрес як завжди через localStorage — Muster сам
 * синхронізує його з акаунтом гравця і відновлює на будь-якому пристрої.
 */
(function () {
  'use strict';

  // Поза Muster нічого не робимо — гра працює як звичайно
  if (window.parent === window) return;

  var storage;
  try {
    storage = window.localStorage;
    storage.getItem('__muster_probe__');
  } catch (e) {
    return;
  }

  var PREFIX = '__muster=';
  var seq = 0;
  var timer = null;
  var dirty = false;

  // 1. Відновлюємо прогрес із хмари ДО запуску коду гри (синхронно)
  try {
    var hash = window.location.hash || '';
    var at = hash.indexOf(PREFIX);

    if (at !== -1) {
      var b64 = hash.slice(at + PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';

      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      var snapshot = JSON.parse(new TextDecoder().decode(bytes));

      if (snapshot && typeof snapshot === 'object') {
        storage.clear();
        Object.keys(snapshot).forEach(function (key) {
          if (typeof snapshot[key] === 'string') storage.setItem(key, snapshot[key]);
        });
      }

      // Прибираємо службовий хеш, щоб не заважав роутеру гри
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  } catch (e) {
    /* якщо відновлення не вдалось — гра просто стартує зі своїми даними */
  }

  // 2. Відправляємо поточний стан у Muster
  function push() {
    timer = null;
    dirty = false;

    var snap = {};
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      if (key === '__muster_probe__') continue;
      snap[key] = storage.getItem(key);
    }

    window.parent.postMessage({ muster: true, id: ++seq, type: 'save', payload: snap }, '*');
  }

  function schedule() {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, 800);
  }

  // 3. Стежимо за змінами localStorage
  var origSet = Storage.prototype.setItem;
  var origRemove = Storage.prototype.removeItem;
  var origClear = Storage.prototype.clear;

  Storage.prototype.setItem = function () {
    origSet.apply(this, arguments);
    if (this === storage) schedule();
  };
  Storage.prototype.removeItem = function () {
    origRemove.apply(this, arguments);
    if (this === storage) schedule();
  };
  Storage.prototype.clear = function () {
    origClear.apply(this, arguments);
    if (this === storage) schedule();
  };

  // Зберігаємо негайно, коли гравець виходить або ховає вкладку
  function flush() {
    if (dirty) push();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  // Перша синхронізація: якщо в хмарі ще нічого немає, віддаємо локальний прогрес
  if (storage.length > 0) setTimeout(push, 1500);
})();
