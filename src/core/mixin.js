import forEach from 'mout/array/forEach';
import riot from 'riot';
import router from './router';

/**
 * touch系イベントが定義されたdom要素群を返却します。
 * @param {Riot} tag
 * @return {Array}
 */
const getTouchableElements = tag => {
  const refs = tag.refs;
  let elms = [];
  if (Array.isArray(refs.touch)) {
    elms = refs.touch;
  } else if (!!refs.touch) {
    elms = [refs.touch];
  }
  return elms;
};

/**
 * Touch系操作に対応する。
 * @param {Riot} tag
 */
const isSupportTouch = 'ontouchstart' in document;
const EVENT_TOUCHSTART = isSupportTouch ? 'touchstart' : 'mousedown';
const EVENT_TOUCHMOVE = isSupportTouch ? 'touchmove' : 'mousemove';
const EVENT_TOUCHEND = isSupportTouch ? 'touchend' : 'mouseup';
const TOUCH_ALLOW_RANGE = 10;
// 無名関数をaddEventListenerのハンドラーに設定した場合でも正しくremoveEventListener出来るようにする。
const closureEventListener = (() => {
  const events = {};
  let key = 0;
  return {
    add: (target, type, listener, capture) => {
      target.addEventListener(type, listener, capture);
      const eventId = `t_${key}`;
      key++;
      events[eventId] = {
        target: target,
        type: type,
        listener: listener,
        capture: capture
      };
      return eventId;
    },
    remove: key => {
      if (!events[key]) {
        return;
      }
      events[key].target.removeEventListener(events[key].type, events[key].listener, events[key].capture);
      delete events[key];
    },
    list: () => {
      return events;
    }
  };
})();
const bindTouchEvents = tag => {
  forEach(getTouchableElements(tag), elm => {
    let touchX = 0, touchY = 0;
    // bind済みであれば何もしない。
    if (!!elm.getAttribute('touchevents')) {
      return;
    }

    const touchStartEventId = closureEventListener.add(elm, EVENT_TOUCHSTART, e => {
      e.stopPropagation();
      if (isSupportTouch) {
        touchX = e.touches[0].pageX;
        touchY = e.touches[0].pageY;
      } else {
        touchX = e.pageX;
        touchY = e.pageY;
      }
      e.currentTarget.classList.add('hover');
    });

    const touchMoveEventId = closureEventListener.add(elm, EVENT_TOUCHMOVE, e => {
      e.stopPropagation();
      const isPressed = e.currentTarget.classList.contains('hover');
      if (!isPressed) {
        return;
      }
      let distanceX = 0, distanceY = 0;
      if (isSupportTouch) {
        distanceX = e.touches[0].pageX - touchX;
        distanceY = e.touches[0].pageY - touchY;
      } else {
        distanceX = e.pageX - touchX;
        distanceY = e.pageY - touchY;
      }
      const hypotenuse = Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2));
      if (hypotenuse >= TOUCH_ALLOW_RANGE) {
        e.currentTarget.classList.remove('hover');
      }
    });

    const touchEndEventId = closureEventListener.add(elm, EVENT_TOUCHEND, e => {
      e.stopPropagation();
      const isPressed = e.currentTarget.classList.contains('hover');
      if (isPressed) {
        // ハンドラーを取得。無ければ何もしない。
        let handlerName = elm.getAttribute('ontap');
        // `parent.handleFoo`形式への対応。
        if (handlerName.indexOf('parent.') === 0) {
          handlerName = handlerName.replace('parent.', '');
        }
        if (!!handlerName && !!tag[handlerName]) {
          tag[handlerName](e);
        }
      }
      e.currentTarget.classList.remove('hover');
    });

    elm.setAttribute('touchevents', `${touchStartEventId}/${touchMoveEventId}/${touchEndEventId}`);
  });
};
const unbindTouchEvents = tag => {
  forEach(getTouchableElements(tag), elm => {
    const touchEvents = elm.getAttribute('touchevents');
    if (!touchEvents) {
      return;
    }
    const touchEventIds = touchEvents.split('/');
    forEach(touchEventIds, touchEventId => {
      closureEventListener.remove(touchEventId);
    });
  });
};

export default {
  /**
   * riotのmixinを設定します。
   * @return {Promise}
   */
  init: () => {
    return Promise
      .resolve()
      .then(() => {
        riot.mixin({
          init: function() {
            this.on('mount', () => {
              bindTouchEvents(this);
            }).on('before-unmount', () => {
              unbindTouchEvents(this);
            });
          },
          // 再度touchイベントをbindする関数。
          // mount後に要素が追加された際に用いる。
          rebindTouchEvents: function() {
            bindTouchEvents(this);
          },
          // riotx.riotxChange(store, evtName, func)のショートカット。
          listen: function(...args) {
            const store = this.riotx.get();
            this.riotxChange(store, ...args);
          },
          // pugファイルとjsファイルを分離して実装可能にするため。
          external: function(script) {
            const tag = this;
            script.apply(tag);
          },
          // `modal`等と意識せずにcloseできるようにする。
          close: function() {
            if (this.opts.isModal) {
              this.opts.modalCloser();
            }
            if (this.opts.isDrawer) {
              this.opts.drawerCloser();
            }
          },
          getRouter: () => {
            return router.getInstance();
          }
        });
      });
  }
};