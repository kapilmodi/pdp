// Test suite to test date filter (download start, end date) 
// functionality. Abstracted out so it can be used by tests of multiple apps.

// TODO: This test suite, while useful and correct, needs some refactoring.
// It could be DRYed up in places and organized better overall.

var each = require('jest-each').default;
var mockHelpers = require('./mock-helpers');
var htmlTemplate = require('./html-template');

function logDownloadDates() {
    // For debugging. Now disabled.
    return;
    var fromDate = getDownloadCfDate('#from-date');
    var toDate = getDownloadCfDate('#to-date');
    console.log(
        '#from-date', fromDate && fromDate.toLooseString(true),
        '#to-date', toDate && toDate.toLooseString(true)
    );
}

function resolveAllDataServices() {
    mockHelpers.resolveAllWithDefault(dataServices);
}

function resetAllDataServices() {
    mockHelpers.resetAll(dataServices);
}

function dateFilterTests(app, config) {
    // Test date-filter components of an app.
    // `app`: Function
    //      builds the app, e.g., `canada_ex_app`
    //
    // 'config`: Object
    //      configures the tests with specifics that vary by app, using the
    //      following properties:
    //
    //      `omitsDateFilter`: Boolean
    //          Set to true to skip tests of date filter and to assert that
    //          date filter controls are not present. This skips almost
    //          all tests that the following properties control.
    //      `cfTimeSystem`: Object
    //          Time system ...
    //          `before`: Assigned by app before data services resolve
    //          `after`: Assigned by app after data services resolve
    //      `defaultStartDate`: Object
    //          Default start date ...
    //          `before`: Assigned by app before data services resolve
    //          `after`: Assigned by app after data services resolve
    //      `defaultEndDate`: Object
    //          Default end date ...
    //          `before`: Assigned by app before data services resolve
    //          `after`: Assigned by app after data services resolve
    //      `omitsDownloadDataLink`: Boolean
    //          Set to true to skip tests on download data link
    //          and to assert that it is absent.
    //      `omitsDownloadFullTimeSeriesCheckbox`: Boolean
    //          Set to true to skip tests on download full time series checkbox
    //          and to assert that it is absent.
    describe('app', function () {
        beforeEach(function () {
            // Reset the DOM (jsdom)
            document.body.innerHTML = htmlTemplate();
            resetAllDataServices();
            app();
        });

        afterEach(function () {
            // Is this necessary?
            document.body.innerHTML = '';
        });

        function getDownloadCfDate(selector) {
            var $downloadForm = $('#download-form');
            var $date = $downloadForm.find(selector);
            return $date.data('cfDate');
        }

        describe('Download form', function () {
            var $downloadForm;

            beforeEach(function () {
                $downloadForm = $('#download-form');
            });

            if (config.omitsDateFilter) {
                describe('contains no date filter controls', function () {
                    each([
                        '#from-date',
                        '#to-date',
                        '#download-full-timeseries'
                    ]).it('%s is absent', function (selector) {
                        var $control = $downloadForm.find(selector);
                        expect($control.length).toBe(0);
                    })
                });
                return;
            }

            describe('date inputs', function () {
                describe('initial values', function () {
                    each([
                        ['before', null],
                        ['after', resolveAllDataServices],
                    ]).describe('%s data services resolve', function (phase, action) {
                        beforeEach(function () {
                            if (action) action();
                        });

                        each([
                            ['#from-date', config.defaultStartDate[phase]],
                            ['#to-date', config.defaultEndDate[phase]],
                        ]).describe('%s', function (selector, expectedCfDate) {

                            it('has expected element content', function () {
                                var $date = $downloadForm.find(selector);
                                expect($date.val())
                                    .toMatch(expectedCfDate.toLooseString(true));
                            });

                            it('has expected attached cfDate', function () {
                                var $date = $downloadForm.find(selector);
                                var cfDate = $date.data('cfDate');
                                expect(cfDate).toBeDefined();
                                expect(cfDate).toEqual(expectedCfDate)
                            });
                        });
                    });

                    describe('Download Full Dataset checkbox', function () {
                        it(
                            'is ' + (config.omitsDownloadFullTimeSeriesCheckbox ? 'absent' : 'present'),
                            function () {
                                var $checkbox = $downloadForm.find('#download-full-timeseries');
                                expect($checkbox.length).toEqual(
                                    config.omitsDownloadFullTimeSeriesCheckbox ? 0 : 1);
                            });
                    });

                    describe('Data download link', function () {
                        it(
                            'is ' + (config.omitsDownloadDataLink ? 'absent' : 'present'),
                            function () {
                                var $link = $downloadForm.find('a#download-timeseries');
                                expect($link.length).toEqual(
                                    config.omitsDownloadDataLink ? 0 : 1);
                            });
                    });
                });

                describe('user interaction', function () {
                    var system;
                    beforeEach(function () {
                        resolveAllDataServices();
                        var $startDate = $downloadForm.find('#from-date');
                        var startDate = $startDate.data('cfDate');
                        system = startDate.system;
                    });

                    // TODO: DRY up valid and invalid input tests
                    describe('with valid inputs', function () {
                        each([
                            // Full date inputs
                            ['#from-date', '1980/01/01', 1980, 1, 1],
                            ['#from-date', '1990/09/30', 1990, 9, 30],
                            ['#to-date', '1980/01/01', 1980, 1, 1],
                            ['#to-date', '1990/09/30', 1990, 9, 30],

                            // Partial date inputs
                            ['#from-date', '1980/01', 1980, 1, 1],
                            ['#from-date', '1980', 1980, 1, 1],
                            ['#to-date', '1980/01', 1980, 1, 1],
                            ['#to-date', '1980', 1980, 1, 1],
                        ]).describe(
                            '%s equals "%s"',
                            function (selector, dateString, year, month, day) {
                                var $date;
                                beforeEach(function () {
                                    // Enter data in the input element
                                    $date = $downloadForm.find(selector);
                                    $date.val(dateString);
                                    $date.change();
                                });

                                it('sets cfDate as expected', function () {
                                    var cfDate = $date.data('cfDate');
                                    expect(cfDate).toEqual(
                                        calendars.CfDatetime.fromDatetime(
                                            system, year, month, day));
                                });

                                it('sets validEntry to true', function () {
                                    var validEntry = $date.data('validEntry');
                                    expect(validEntry).toBe(true);
                                });

                                it('sets the input element to full date',
                                    function () {
                                        var lz2 = calendars.lz2;
                                        var expected = year + '/' + lz2(month) + '/' + lz2(day);
                                        expect($date.val()).toBe(expected);
                                    }
                                );

                                it('shows no error message', function () {
                                    var $error = $(selector + '-error-message');
                                    expect($error.length).toBe(1);
                                    expect($error.hasClass('inactive')).toBe(true);
                                    var $errorMsg = $(selector + '-error-message .value');
                                    expect($errorMsg.length).toBe(1);
                                    expect($errorMsg.text()).toMatch(/^\s*$/);
                                });

                                if (!config.omitsDownloadDataLink) {
                                    it('sets the download data link correctly', function () {

                                        var $link = $('#download-timeseries');
                                        var linkUrl = $link.attr('href');

                                        var startDate = getDownloadCfDate('#from-date');
                                        var endDate = getDownloadCfDate('#to-date');

                                        expect(linkUrl).toMatch(RegExp(
                                            '\\?\\w+\\[' +
                                            startDate.toIndex() + ':' + endDate.toIndex() +
                                            '\\]'
                                        ));
                                    });
                                }

                            }
                        );
                    });

                    describe('with invalid inputs', function () {
                        each([
                            ['#from-date', 'foobar'],
                            ['#to-date', 'foobar'],
                        ]).describe(
                            '%s equals "%s"',
                            function (selector, dateString) {
                                var $date;
                                beforeEach(function () {
                                    // Enter data in the input element
                                    $date = $downloadForm.find(selector);
                                    $date.val(dateString);
                                    $date.change();
                                });

                                it('sets cfDate as expected', function () {
                                    var fallbackDate = selector === '#to-date' ?
                                        system.lastCfDatetime() :
                                        system.firstCfDatetime();
                                    var cfDate = $date.data('cfDate');
                                    expect(cfDate).toEqual(fallbackDate);
                                });

                                it('sets validEntry to false', function () {
                                    var validEntry = $date.data('validEntry');
                                    expect(validEntry).toBe(false);
                                });

                                it('doesn\'t modify the input element', function () {
                                    expect($date.val()).toBe(dateString);
                                });

                                it('shows an error message', function () {
                                    var $error = $(selector + '-error-message');
                                    expect($error.length).toBe(1);
                                    var $errorMsg = $(selector + '-error-message .value');
                                    expect($errorMsg.length).toBe(1);
                                    expect($error.hasClass('inactive')).toBe(false);
                                    expect($errorMsg.text()).toMatch('not in acceptable date-time format');
                                });
                            }
                        );
                    });
                });
            });

            describe('annotations', function () {
                beforeEach(function () {
                    resolveAllDataServices();
                });

                describe('calendar', function () {
                    var $msg;
                    beforeEach(function () {
                        $msg = $('#date-range-calendar .value');
                    });

                    it('exists', function () {
                        expect($msg.length).toBe(1);
                    });

                    it('indicates the expected calendar', function () {
                        var msg = $msg.text();
                        expect(msg).toMatch(
                            config.cfTimeSystem.after.startDate.calendar.name
                        );  // FFFFFFUUUUUU
                    });
                });

                describe('time system', function () {
                    it('indicates the expected units-since', function () {
                        var msg = $('#date-range-ts').text();
                        var ts = config.cfTimeSystem.after;
                        expect(msg).toMatch(new RegExp(
                            ts.units + '\\s+since\\s+' +
                            ts.startDate.toISOString(true)
                        ));
                        // expect(msg).toMatch(/days\s+since\s+1950-01-01/);
                    });

                    it('indicates the expected max date', function () {
                        var msg = $('#date-range-ts-max-date').text();
                        var ts = config.cfTimeSystem.after;
                        expect(msg).toMatch(ts.lastCfDatetime().toISOString(true));
                    });
                });

            });

            if (!config.omitsDownloadFullTimeSeriesCheckbox) {
                describe('Download Full Timeseries checkbox', function () {
                    describe('sets inputs correctly when checked', function () {
                        beforeEach(function () {
                            resolveAllDataServices();
                        });

                        // We have to use a function to specify the value of
                        // `expectedCfDate` because values set in beforeEach (here,
                        // specifically, `$downloadForm`) are not defined outside of
                        // a test body. So this variable must be evaluated in
                        // the context of the test body. Which requires a function in
                        // the `each`.
                        each([
                            ['#from-date', function (system) {
                                return system.firstCfDatetime();
                            }],
                            ['#to-date', function (system) {
                                return system.lastCfDatetime();
                            }]
                        ]).it('%s', function (selector, expectedCfDate) {
                            var $date = $downloadForm.find(selector);
                            var $checkbox = $downloadForm.find('#download-full-timeseries');

                            // Check the checkbox
                            $checkbox.attr('checked', true);
                            $checkbox.change();

                            var cfDate = $date.data('cfDate');

                            // Test input element state
                            expect($date.prop('disabled')).toBe(true);


                            // Test data associated with input element
                            expect(cfDate).toEqual(expectedCfDate(cfDate.system));

                            // Test input element content
                            expect($date.val()).toEqual(cfDate.toLooseString(true));

                            // Uncheck the checkbox
                            $checkbox.attr('checked', false);
                            $checkbox.change();

                            // And Test that the input element is re-enabled and
                            // retains the reset (all-time) date.
                            expect($date.prop('disabled')).toBe(false);
                            expect($date.data('cfDate')).toEqual(cfDate);
                            // Check input element content
                            expect($date.val()).toEqual(cfDate.toLooseString(true));
                        });
                    });
                });
            }

        });

        if (!config.omitsDownloadDataLink) {
            describe('Data Download link', function () {
                var $link;
                beforeEach(function () {
                    resolveAllDataServices();
                    $link = $('#download-timeseries');
                });

                it('exists', function () {
                    expect($link.length).toBeGreaterThan(0);
                });

                it('has the expected initial time range', function () {
                    var linkUrl = $link.attr('href');

                    if (config.omitsDateFilter) {
                        expect(linkUrl).toMatch(/\?[^[]+\[\]/);
                    } else {
                        var startDate = getDownloadCfDate('#from-date');
                        var endDate = getDownloadCfDate('#to-date');

                        expect(linkUrl).toMatch(RegExp(
                            '\\?\\w+\\[' +
                            startDate.toIndex() + ':' + endDate.toIndex() +
                            '\\]'
                        ));
                    }
                });

            });
        }
    });
}


module.exports = dateFilterTests;
