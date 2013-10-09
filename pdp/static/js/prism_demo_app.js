// Globals current_dataset, selectionLayer, ncwmsCapabilities

$(document).ready(function() {
    map = init_prism_map();
    init_login('login-div');

    ensemble_name = 'bc_prism_demo';
    $.ajax({'url': app_root + '/data/' + ensemble_name + '/catalog.json',
        'type': 'GET',
        'dataType': 'json',
        'success': function(data, textStatus, jqXHR) {
            catalog = data;
        }}
    );
    
    // TODO: This can cause some incorrect formatting in the menu...
    // current_layer = map.getLayersByName('Climate raster')[0];
    // amenu.open(current_layer.params.LAYERS, true);
    
    var selector = document.getElementById("pdp-controls").appendChild(getPRISMControls(ensemble_name));
    var downloader = document.getElementById("pdp-controls").appendChild(getPRISMDownloadOptions());

    ncwms_layer = map.getLayersByName('Climate raster')[0];

    $("#download-timeseries").click(function(){
    	type = $('select[name="data-format"]').val()
   		download(type, map, selectionLayer, ncwms_layer);
    });

    // For testing purposes:
    var test_poly = new OpenLayers.Feature.Vector(
    	// new OpenLayers.Geometry.fromWKT("POLYGON((-123.99271714942358 57.89648225746951,-121.76959864936369 57.89648225746951,-121.76959864936369 58.96152484973735,-123.99271714942358 58.96152484973735,-123.99271714942358 57.89648225746951))"
    	// 	).transform(getProjection(4326), getProjection(3005)))
    	new OpenLayers.Geometry.fromWKT("POLYGON((1000000 1000000,1050000 1000000,1050000 1050000,1000000 1050000,1000000 1000000))"))
    selectionLayer.addFeatures([test_poly]);
});
