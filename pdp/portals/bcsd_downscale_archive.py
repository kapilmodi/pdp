'''This portal serves the version 1 BCCAQ downscaled (10km) data 
and BCSD data for all of Canada. (This data has been superceded by
the BCCAQ (4km) data.) This portal is identical, save the ensemble
name, title, urlbase, and model display formatting, to the 
bccaq_downscale portal (bccaq_downscale.py), which serves the new
data. They share a front end.
'''

from pdp import wrap_auth
from pdp.dispatch import PathDispatcher
from pdp_util.map import MapApp
from pdp_util.raster import RasterServer, RasterCatalog, RasterMetadata
from pdp_util.ensemble_members import EnsembleMemberLister

from pdp.minify import wrap_mini
from pdp.portals import updateConfig, raster_conf

ensemble_name = 'downscaled_gcms_archive'
url_base = 'downscaled_gcms_archive'


class DownscaledEnsembleLister(EnsembleMemberLister):
    def list_stuff(self, ensemble):
        for dfv in ensemble.data_file_variables:
            yield dfv.file.run.emission.short_name,\
                dfv.file.run.model.short_name.replace('BCCAQ', 'BCCAQv1'),\
                dfv.netcdf_variable_name,\
                dfv.file.unique_id.replace('+', '-')


def data_server(config, ensemble_name):
    dsn = config['dsn']
    conf = raster_conf(dsn, config, ensemble_name, url_base)
    data_server = wrap_auth(RasterServer(dsn, conf))
    return data_server


def portal(config):
    dsn = config['dsn']
    portal_config = {
        'title': 'Statistically Downscaled GCM Scenarios - Archived Methods',
        'ensemble_name': ensemble_name,
        'js_files':
            wrap_mini([
                'js/canada_ex_map.js',
                'js/canada_ex_app.js'],
                basename=url_base, debug=(not config['js_min'])
            )
    }

    portal_config = updateConfig(config, portal_config)
    map_app = wrap_auth(MapApp(**portal_config), required=False)

    conf = raster_conf(dsn, config, ensemble_name, url_base)
    catalog_server = RasterCatalog(dsn, conf)  # No Auth

    menu = DownscaledEnsembleLister(dsn)

    metadata = RasterMetadata(dsn)

    return PathDispatcher([
        ('^/map/?.*$', map_app),
        ('^/catalog/.*$', catalog_server),
        ('^/menu.json.*$', menu),
        ('^/metadata.json.*$', metadata),
    ])
