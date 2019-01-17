# pdp - PCIC Data Portal

The PCIC Data Portal contains the frontend code required for the [PCIC Data Portal](http://www.pacificclimate.org/data) as well as WSGI callables to deploy the entire application within a WSGI container.

The following guide assumes an ubuntu/debian based system.

## Dependencies

The pdp requires that pip and tox be installed.

```bash
sudo apt-get install python-pip python-dev build-essential
sudo pip install tox ## or pip install tox --user
```

Some of the required python libraries have system-level dependencies.

```bash
sudo apt-get install libhdf5-dev libnetcdf-dev libgdal-dev
```

And GDAL doesn't properly source it's own lib paths when installing the python package:

```bash
export CPLUS_INCLUDE_PATH=/usr/include/gdal
export C_INCLUDE_PATH=/usr/include/gdal
```

## Installation

### Development

With the prerequisites, creating a development environment should be as simple as:

```bash
git clone https://github.com/pacificclimate/pdp
cd pdp
tox -e devenv
```

It could take 5-30 minutes since tox will not use system packages and needs to build any package which requires it.

### Production

It is best practice to maintain a consistent virtual environment for production.

```bash
git clone https://github.com/pacificclimate/pdp
cd pdp
virtualenv pyenv
```

The pdp will run in any WSGI container. This guide uses gunicorn.

```bash
pyenv/bin/pip install -i https://pypi.pacificclimate.org/simple/ -r requirements.txt -r data_format_requirements.txt -r test_requirements.txt -r deploy_requirements.txt
```

Install and build the docs. Building the docs requires the package to be installed, then installed again after the docs are built.

```bash
pyenv/bin/python setup.py install
pyenv/bin/python setup.py build_sphinx
pyenv/bin/python setup.py install
```

## Configuration

Configuration of the PDP is accomplished through a set of environment variables. A sample environment file is stored in `pdp/config.env`. This environment file can be sourced in before you run the pdp, included in a Docker deployment or used in any other flexible way.

```bash
source pdp/config.env
export $(grep -v '^#' pdp/config.env | cut -d= -f1)
```

### Config Items

###### `app_root`

Root location where data portal will be exposed. This location will need to be proxied to whatever port the server will be running on.

###### `data_root`

Root location of backend data server. Probably `<app_root>/data`. If you are running in production, this location will need to be proxied to whatever port the data server will be running on. When running a development server, this is redirected internally.

###### `dsn`

Raster metadata database url of the form `dialect[+driver]://username:password@host:port/database`. Password must either be supplied or available in the user's `~/.pgpass` file.

###### `pcds_dsn`

PCDS database URL of the form `dialect[+driver]://username:password@host:port/database`. Password must either be supplied or available in the user's `~/.pgpass` file.

###### `js_min`

Determine's use of javascript bundling/minification.

###### `geoserver_url`

PCDS Geoserver URL

###### `ncwms_url`

Raster portal ncWMS URL

###### `tilecache_url`

Tileserver URLs (space separated list) for base maps

###### `use_analytics`

Enable or disable Google Analytics reporting

###### `analytics`

Google Analytics ID

## Tests

When correctly configured, all the tests should now pass.

```bash
pyenv/bin/py.test -vv --tb=short tests
```

## Deploying

### Development

Provided you installed everything with `tox`, you should be able to run a development server with

```bash
devenv/bin/python scripts/rast_serve -p <port> [-t]
```

### Production

A production install should be run in a production ready WSGI container with proper process monitoring. We use [gunicorn](http://gunicorn.org/) as the WSGI container, [Supervisord](http://supervisord.org/) for process monitoring, and [Apache](http://httpd.apache.org/) as a reverse proxy.

In production, the frontend and backend are ran in seperate WSGI containers. This is because the front end serves short, non-blocking requests, whereas the back end serves fewer long, process blocking requests.

#### Gunicorn

Running in gunicorn can be tested with a command similar to the following:

```bash
pyenv/bin/gunicorn -b 0.0.0.0:<port1> pdp.wsgi:frontend
pyenv/bin/gunicorn -b 0.0.0.0:<port2> pdp.wsgi:backend
```

#### Supervisord

*Note: this is only an **example** process monitoring setup. Details can and will be different depending on your particular deployment stragety*

Set up the Supervisord config file using
```bash
pyenv/bin/echo_supervisord_conf > /install/location/supervisord.conf
```

In order to run Supervisord, the config file must have a `[supervisord]` section. Here's a sample section:

```ini
[supervisord]
logfile=/install/location/etc/<supervisord_logfile>      ; (main log file;default $CWD/supervisord.log)
loglevel=info     ; (log level;default info; others: debug,warn,trace)
nodaemon=true     ; (start in foreground if true; useful for debugging)
```

Supervisorctl is a command line utility that lets you see the status and output of processes and start, stop and restart them. The following will set up supervisorctl using a unix socket file, but it is also possible to monitor processes using a web interface if you wish to do so.

```ini
[unix_http_server]
file = /tmp/supervisord.sock

[supervisorctl]
serverurl = unix:///tmp/supervisord.sock

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface
```

Front end config

```ini
[program:pdp_frontend-v.v.v]
command=/install/location/pyenv/bin/gunicorn -b 0.0.0.0:<port> --access-logfile=<access_logfile> --error-logfile=<error_logfile> pdp.wsgi:frontend
directory=/install/location/
user=www-data
environment=OPTION0="",OPTION2=""...
autostart=true
autorestart=true
redirect_stderr=True
killasgroup=True
```

Back end config

```ini
[program:pdp_backend-v.v.v]
command=/install/location/pyenv/bin/gunicorn -b 0.0.0.0:<port> --workers 10 --worker-class gevent -t 3600 --access-logfile=<access_logfile> --error-logfile=<error_logfile> pdp.wsgi:backend
directory=/install/location/
user=www-data
environment=OPTION0="",OPTION2=""...
autostart=true
autorestart=true
redirect_stderr=True
killasgroup=True
```

To make starting/stop easier, add a group to `supervisord.conf`

```ini
[group:v.v.v]
programs=pdp_frontend-v.v.v,pdp_backend-v.v.v
```

Once the config file has been set up, start the processes with the following command:

```bash
pyenv/bin/supervisord -c path/to/supervisord.conf
```

After invoking Supervisord, use supervisorctl to monitor and update the running processes

```bash
pyenv/bin/supervisorctl
```

When upgrading, it's easiest to simply copy the existing config and update the paths/version number.

**IMPORTANT**: When adding a new version, make sure to set the old version `autostart` and `autorestart` to false.

Using `supervisorctl`, you should then be able to `reread` the new config, `update` the old version config (so it stops, picks up new autostart/autorestart=false), and `update` the new version.

If there are any errors, they can be found in the `supervisord_logfile`. Errors starting gunicorn can be found in the `error_logfile`.
