(function() {
    if (typeof window === 'undefined') return;
    if (typeof window.signals !== 'undefined') return;
    var script = document.createElement('script');
    script.src = 'https://cdn.cr-relay.com/v1/site/c63d3c5e-80ca-48f9-ba3a-a476008f8932/signals.js';
    script.async = true;
    window.signals = Object.assign(
    [],
    ['page', 'identify', 'form'].reduce(function (acc, method){
    acc[method] = function () {
    signals.push([method, arguments]);
    return signals;
};
    return acc;
}, {})
    );
    document.head.appendChild(script);
})();