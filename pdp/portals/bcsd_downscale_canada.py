'''The pdp.portals.bcsd_downscale_canada module configures a raster portal to serve BCSD and BCCAQ downscaled (10km) data over all of Canada.
'''

from pdp import wrap_auth
from pdp.dispatch import PathDispatcher
from pdp_util import session_scope
from pdp_util.map import MapApp
from pdp_util.raster import RasterServer, RasterCatalog, RasterMetadata, db_raster_configurator
from pdp_util.ensemble_members import DownscaledEnsembleLister

from pdp.minify import wrap_mini
from pdp.portals import updateConfig

def portal(dsn, global_config):

    ensemble_name = 'bcsd_downscale_canada'

    portal_config = {
        'title': 'Statistically Downscaled GCM Scenarios',
        'ensemble_name': ensemble_name,
        'js_files' :
            wrap_mini([
                'js/canada_ex_map.js',
                'js/canada_ex_controls.js',
                'js/canada_ex_app.js'],
                basename='downscaled_gcms', debug=False
            )
    }

    portal_config = updateConfig(global_config, portal_config)
    map_app = wrap_auth(MapApp(**portal_config), required=False)

    dsn = dsn + '?application_name=pdp_bcsd'
    with session_scope(dsn) as sesh:
        conf = db_raster_configurator(sesh, "Download Data", 0.1, 0, ensemble_name, 
            root_url=global_config['app_root'].rstrip('/') + '/downscaled_gcms/data/'
        )
        data_server = wrap_auth(RasterServer(dsn, conf))
        catalog_server = RasterCatalog(dsn, conf) #No Auth

    menu = DownscaledEnsembleLister(dsn)

    metadata = RasterMetadata(dsn)

    return PathDispatcher([
        ('^/map/?.*$', map_app),
        ('^/catalog/.*$', catalog_server),
        ('^/data/.*$', data_server),
        ('^/menu.json.*$', menu),
        ('^/metadata.json.*$', metadata),
    ])
