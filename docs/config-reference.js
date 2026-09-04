// Client-side enhancements for the server configuration reference. Marks the
// page with `config-reference` on <html> so styles.css can scope its badge
// styling to it, and makes the TOML key and environment variable badges
// click-to-copy, so you can lift either one for an option without walking back
// up the nested sections by hand.
//
// Mintlify renders each string of a `<ResponseField post={[...]}>` array as its
// own element tagged `data-component-part="field-meta-post"`, with no way to
// distinguish them in markup. The `toml:` / `env:` ones are therefore found by
// their label and marked with `data-copy`, which is what the styling in
// styles.css keys off; the schema badges (`format:`, `enum:`, `minimum:`, ...)
// are left inert. Clicking is handled by a single delegated listener, so no
// per-badge state has to survive the app's re-renders.
(function () {
    "use strict";

    var PAGE = "/references/server-config";
    var BADGE = '[data-component-part="field-meta-post"]';
    var LABEL = /^(?:toml|env):\s*/;
    var FEEDBACK_MS = 1200;
    var DECORATE_DEBOUNCE_MS = 100;

    var timers = new WeakMap();
    var observer;
    var pending = 0;

    function onConfigPage() {
        return location.pathname.replace(/\/+$/, "") === PAGE;
    }

    // Marks every badge as copyable or not. Badges are marked either way, so a
    // pass only ever inspects ones it has not seen before.
    function decorate() {
        var fresh = document.querySelectorAll(BADGE + ":not([data-copy])");
        for (var i = 0; i < fresh.length; i++) {
            fresh[i].setAttribute("data-copy", LABEL.test(fresh[i].textContent) ? "1" : "0");
        }
    }

    function scheduleDecorate() {
        if (pending) return;
        pending = setTimeout(function () {
            pending = 0;
            decorate();
        }, DECORATE_DEBOUNCE_MS);
    }

    // Scoped to the reference page: `field-meta-post` is a generic Mintlify part,
    // and there is no reason to watch the DOM anywhere else.
    function syncScope() {
        var active = onConfigPage();
        document.documentElement.classList.toggle("config-reference", active);
        if (active) {
            observer.observe(document.body, { childList: true, subtree: true });
            scheduleDecorate();
        } else {
            observer.disconnect();
        }
    }

    function flash(badge) {
        clearTimeout(timers.get(badge));
        badge.setAttribute("data-copied", "");
        timers.set(badge, setTimeout(function () {
            badge.removeAttribute("data-copied");
        }, FEEDBACK_MS));
    }

    document.addEventListener("click", function (event) {
        if (!onConfigPage() || !event.target || !event.target.closest) return;

        var badge = event.target.closest(BADGE);
        if (!badge) return;

        // Tested here rather than trusting data-copy, so a click is never wrong
        // even if a decorate pass has not caught up with the DOM yet.
        var text = badge.textContent.trim();
        if (!LABEL.test(text) || !navigator.clipboard) return;

        // Copy the bare value: `toml: admin.bind-address` yields the key alone,
        // which is what you paste into a config file or a shell.
        navigator.clipboard.writeText(text.replace(LABEL, "")).then(function () {
            flash(badge);
        }, function () {
            // Clipboard denied (insecure context, permissions): leave the badge
            // as plain selectable text rather than claiming a copy happened.
        });
    });

    function start() {
        observer = new MutationObserver(scheduleDecorate);

        // Mintlify routes client-side, so `popstate` alone misses in-app links.
        ["pushState", "replaceState"].forEach(function (method) {
            var original = history[method];
            history[method] = function () {
                var result = original.apply(this, arguments);
                syncScope();
                return result;
            };
        });
        window.addEventListener("popstate", syncScope);

        syncScope();
    }

    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
})();
