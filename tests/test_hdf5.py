import os
from tempfile import NamedTemporaryFile

from webob.request import Request
import pytest

import netCDF4

def test_can_instantiate_raster_pydap(raster_pydap):
    assert isinstance(raster_pydap, object)

def test_hdf5_to_netcdf(pcic_data_portal, authorized_session_id):
    req = Request.blank('/downscaled_gcms/data/pr+tasmax+tasmin_day_BCSD+ANUSPLIN300+CCSM4_historical+rcp26_r2i1p1_19500101-21001231.nc.nc?pr[0:1:1][116:167][84:144]&')
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)

    assert resp.status == '200 OK'
    assert resp.content_type == 'application/x-netcdf'
    
    f = NamedTemporaryFile(suffix='.nc')
    for block in resp.app_iter:
        f.write(block)

    # for now, just check that netCDF4 can open it and that's good enough
    nc = netCDF4.Dataset(f.name, 'r')
    nc.close()
    os.remove(f.name)

def test_prism_response(pcic_data_portal, authorized_session_id):
    req = Request.blank('/bc_prism/data/tmin_monClim_PRISM_historical_run1_197101-200012.nc.html')
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type == 'text/html'
    
def test_dds_response(pcic_data_portal, authorized_session_id):
    req = Request.blank('/downscaled_gcms/data/pr+tasmax+tasmin_day_BCSD+ANUSPLIN300+CCSM4_historical+rcp26_r2i1p1_19500101-21001231.nc.dds')
    req.cookies['beaker.session.id'] = authorized_session_id
    resp = req.get_response(pcic_data_portal)
    assert resp.status == '200 OK'
    assert resp.content_type.startswith('text/plain')
    body = ''.join([ x for x in resp.app_iter ])
    assert body == '''Dataset {
    Float64 lon[lon = 1068];
    Float64 lat[lat = 510];
    Float64 time[time = 55152];
    Grid {
        Array:
            Float32 pr[time = 55152][lat = 510][lon = 1068];
        Maps:
            Float64 time[time = 55152];
            Float64 lat[lat = 510];
            Float64 lon[lon = 1068];
    } pr;
    Grid {
        Array:
            Float32 tasmax[time = 55152][lat = 510][lon = 1068];
        Maps:
            Float64 time[time = 55152];
            Float64 lat[lat = 510];
            Float64 lon[lon = 1068];
    } tasmax;
    Grid {
        Array:
            Float32 tasmin[time = 55152][lat = 510][lon = 1068];
        Maps:
            Float64 time[time = 55152];
            Float64 lat[lat = 510];
            Float64 lon[lon = 1068];
    } tasmin;
} pr%2Btasmax%2Btasmin_day_BCSD%2BANUSPLIN300%2BCCSM4_historical%2Brcp26_r2i1p1_19500101-21001231%2Enc;
'''
