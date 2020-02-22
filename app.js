(function() {
    Moon.Plugin.getPlugin('./setting.json', loaded);

    function loaded(json) {
        Moon.init({ canvas: json.canvas, width: json.width || 800, height: json.height || 600 });
        Moon.Plugin.loadPlugin(json.plugin, function() {
            Moon.Plugin.loadScript(json.main);
        });
    }
}());