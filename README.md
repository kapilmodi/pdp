# pdp - PCIC Data Portal

The PCIC Data Portal contains the frontend code required for the [PCIC Data Portal](http://www.pacificclimate.org/data) as well as WSGI callables to deploy the entire application within a WSGI container.

The following guide assumes an ubuntu/debian based system.

## Dependencies

### Python

The server for the PDP frontend is written in Python.
It packages up, minifies, and serves the various "static" JS files and other resources
(e.g., CSS) from which the frontend is built.

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

### Node.js (test framework only)

The test framework for the PDP frontend runs in [Node.js](https://nodejs.org/en/).

There are several different valid ways to install Node.js on a Ubuntu system. 

We reccomend using [nvm](https://github.com/creationix/nvm) to manage your node/npm install.
It is a little more laborious (not a lot), and provides a lot more flexibility than the
simpler installation methods, which you can look up by searching "ubuntu install nodejs".

## Installation

### Development

#### Server

With the prerequisites, creating a development environment should be as simple as:

```bash
git clone https://github.com/pacificclimate/pdp
cd pdp
tox -e devenv
```

It could take 5-30 minutes since tox will not use system packages and needs to build any package which requires it.

#### JS tests

With Node.js installed (see above), you can install all the test framework dependencies
as follows:

```bash
npm install
``` 

Notes: 

* The JS tests are written using test framework called [Jest](https://jestjs.io/) 
which provides many useful features, including a simulation of the DOM in JS 
that enables tests of code that manipulate the DOM. 

* DOM simulation is provided by a package called `jsdom`, which ships with Jest.
However, the version that currently ships lacks a couple of features that we need, 
so we install `jest-environment-jsdom-fourteen`, which upgrades the version of 
`jsdom`. This may become unnecessary with later versions of Jest.

* Since little of the JS code is written with unit testing in mind, 
we exploit `jsdom` heavily in the tests. Essentially, these tests use 
jQuery queries to find out what is going on in the DOM as the app does its thing.


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

### Python

When correctly configured, all the tests should now pass.

```bash
pyenv/bin/py.test -vv --tb=short tests
```

### Node.js (tests of JS code)

All JS tests are found in the directory `pdp/static/js/__test__`.

No configuration is required to run the Node.js tests. Simply:

```bash
npm run test
```

## Deploying

### Development

Provided you installed everything with `tox`, you should be able to run a development server as follows:

First set up the environment variables that do not default to usable values. 
Obtain the user ID's and passwords necessary for the two databases from PCIC IT.
We typically use port 8000 but any port will do.

```bash
export DSN=postgresql://<USER>:<PASSWORD>@db3.pcic.uvic.ca/pcic_meta
export DATA_ROOT=http://127.0.0.1:<PORT>/data
export PCDS_DSN=postgresql://<USER>:<PASSWORD>@db3.pcic.uvic.ca/crmp
export APP_ROOT=http://127.0.0.1:<PORT>
```

Run the server:

```bash
devenv/bin/python scripts/rast_serve.py -p <PORT> [-t]
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

## Module `calendars`

### Introductory notes

- In this section, we use the term `class`, a concept which strictly speaking JS doesn't support.
However, we use JS patterns that emulate class-based code fairly closely; in particular, that emulate
many of the features of the ES6 `class` syntactic sugar. This is currently done via the utilities provided
in module `classes`.

- Objects that can be instantiated with these constructors are mutable, but few if any mutation methods are
provided. This is because mutation makes code hard to reason about 
(it removes [referential transparency](https://nrinaudo.github.io/scala-best-practices/definitions/referential_transparency.html)).
Instead of mutation, prefer to create a new object containing the new value, rather than mutating an old object.

### Calendars

PDP datasets use a variety of different, mutually incompatible calendar systems. These systems include:

- Standard or Gregorian calendar.
- 365-day calendar: Like the Gregorian calendar, but without leap years.
- 360-day calendar: Every month in every year has exactly 30 days.

JavaScript directly supports only the Gregorian calendar, via the `Date` object. It is not possible (whilst retaining
developer sanity, or code maintainability) to handle non-Gregorian calendars using a Gregorian calendar.
Previous code that attempted to do so contained errors traceable to the incompatibility of different calendar systems.

To address this situation, we have defined a module `calendars` containing the following items:

- Class `Calendar`, which represents the general notion of a calendar, 
and subclasses `GregorianCalendar`, `Fixed365DayCalendar`, `Fixed360DayCalendar`, which represent specific, 
different calendar types.
   - Rightly or wrongly, `Calendar`s are used as instances (so far we have only discussed things that could be
   equally well be supplied by a fixed object, or singleton). 
   - Each `Calendar` instance has an epoch year, which defines the epoch or origin date for computations the calendar 
   can perform. Dates before Jan 1 of the epoch year are not valid. This is stupid, a result of lazy implementation, 
   but it is true for now. Default epoch year is 1800.
   - `Calendar` has abstract methods `isLeapYear()`,  `daysPerMonth()`, `daysPerYear()` that concrete subclasses 
   define in order to specify different particular calendars.
   - `Calendar` provides a number of service methods for validating datetimes and for computing essential 
   quantities, such as the number of milliseconds since epoch. These are fundamental to datetime computations within
   any given calendar system.
   
Most users of this module will not need to define their own `Calendar` subclasses, nor their own instances of
those subclasses (specifying `epochYear`), since the provided standard instances are designed to meet known use cases
in PDP. However, the option is there for unforeseen applications.

- The standard (and default) `epochYear` is 1800. 
- The `calendars` module offers pre-instantiated standard calendars of each type, indexed by the standard CF identifiers
for each type:
   - `calendars['standard']`,`calendars['gregorian']`
   - `calendars['365_day']`, `calendars['noleap']`
   - `calendars['360_day']`

### Datetimes (in specific calendars)

The following classes exploit `Calendar` objects to represent datetimes in specific calendrical systems.
   
- Class `SimpleDatetime` that bundles together the `year`, `month`, `day`, etc. components of a datetime, 
_without reference to any specific calendar_.

- Class `CalendarDatetime` composes a `Calendar` with a `SimpleDatetime`, to represent a datetime in a particular
calendar. (Note: We [prefer composition over inheritance](https://en.wikipedia.org/wiki/Composition_over_inheritance).)
   - At the moment, it offers only conversion methods (e.g., `toISOString()`) and factories (e.g., `fromMsSinceEpoch()`).
   - This would be the class in which to place calendar-aware datetime arithmetic methods (e.g., `addDays()`), 
   but we have no use for this in present applications so the class lacks such methods.

### CF time systems
   
In CF standards compliant datasets, datetimes are represented by index values (values of the time dimension) 
in a time system defined by units, start datetime, and calendar. 

- Units are fixed intervals of time labelled by terms such as 'day', 'hour', 'minute'. 
- A start datetime is a specification of year, month, day, etc., in a specified calendar system.
- The calendar is specified an identifier chosen from a fixed CF vocabulary that includes 'standard', 'gregorian', 
'365_day', 'noleap', and '360_day', with the obvious meanings.
- A time index _t_ specifies a time point defined as _t_ time units after the start datetime, in the specified calendar.

The following classes represent time systems and datetimes within such a system:
   
- Class `CfTimeSystem`, which represents a CF time system, as above.
  - Constructed with arguments `units` and `startDate`; the latter is a `CalendarDatetime`, which carries both
  the calendar and the datetime. This is one of the places where method signature is hard to remember, and
  could perhaps be improved.
  
- Class `CfDatetime`, which [composes](https://en.wikipedia.org/wiki/Composition_over_inheritance) a 
`CfTimeSystem` and a real-valued index to represent a specific time within a CF time system.
   - Like `CalendarDatetime` (to which it is a parallel), `CfDatetime` offers only conversion methods 
   (e.g., `toISOString()`, `toCalendarDatetime`) and factories (e.g., `fromLooseFormat()`).
   - Like `CalendarDatetime`, this is the class in which time arithmetic methods would be placed, but none are
   currently needed, so none exist.
   
### Usage

Playing at classes is all very well, till somebody loses their mind. How is this intended to be used?

Here are some code snippets that show the application of these objects. Some make it obvious that it
would be nicer to have (a) more consistent and/or flexible method signatures, and (b) more helper methods.

#### `CalendarDatetime`: Datetimes in various calendars

```javascript
// Date in Gregorian calendar.
const apollo11 = new CalendarDatetime(new GregorianCalendar(), 1969, 7, 20);
console.log(apollo11.toISOString()); // -> 1969-07-20T00:00:00
console.log(apollo11.toISOString(true)); // -> 1969-07-20

// Or, using the pre-instantiated Gregorian calendar.
const apollo11 = new CalendarDatetime(calendars.gregorian, 1969, 7, 20);

// Dates in non-Gregorian calendar
const endOfCentury = new CalendarDatetime(calendars['365_day'], 2099, 12, 31);
console.log(endOfCentury.toLooseString()); // -> 2099/12/31 00:00:00
console.log(endOfCentury.toLooseString(true)); // -> 2099/12/31
```

#### `CfTimeSystem`: CF time systems

```javascript
// A CF time system: days since 1950-01-01 in 360-day calendar; maximum time index 99999.
const sinceDate = new CalendarDatetime(calendars['360_day'], 1950, 1, 1);
const cfTimeSystem = new CfTimeSystem('days', sinceDate, 99999);
```

#### `CfDatetime`: CF time points

```javascript
// A CF datetime in the above time system, specified several different ways.
const cfDatetime = new CfDatetime(cfTimeSystem, 720);
const cfDatetime = CfDatetime.fromDatetime(cfTimeSystem, 1952, 1, 1);
const cfDatetime = CfDatetime.fromLooseFormat(cfTimeSystem, '1952/01/01');
console.log(cfDatetime.index); // -> 720
console.log(cfDatetime.toLooseString(true)); // -> 1952/01/01
```

```javascript
// Some possibly useful time points in the above time system. 
// Note these are `CfDatetime`s, not CalendarDatetime`s.
const start = cfTimeSystem.firstCfDatetime();
console.log(start.index);  // -> 0

const end = cfTimeSystem.lastCfDatetime();
console.log(end.index);  // -> 99999

const today = cfTimeSystem.todayAsCfDatetime();
console.log(today.index);  // -> some value around (<current year> - 1950) * 360
```
