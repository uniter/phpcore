/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    expect = require('chai').expect,
    nowdoc = require('nowdoc'),
    tools = require('../tools');

describe('PHP "goto" statement integration', function () {
    _.each({
        'jumping over first echo to second': {
            code: nowdoc(function () {/*<<<EOS
<?php
    goto second;
    echo 'first';

second:
    echo 'second';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'second'
        },
        'jumping over unused label': {
            code: nowdoc(function () {/*<<<EOS
<?php
    goto second;

first:
    echo 'first';
second:
    echo 'second';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'second'
        },
        'jumping over first echo to second inside if with falsy condition': {
            code: nowdoc(function () {/*<<<EOS
<?php
    goto second;
    echo 'first';

    if (0) {
second:
        echo 'second';
    }
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'second'
        },
        'jumping over first echo to third inside if with falsy condition': {
            code: nowdoc(function () {/*<<<EOS
<?php
    goto second;
    echo 'first';

    if (0) {
        echo 'second';
second:
        echo 'third';
    }
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'third'
        },
        'jumping over first if statement to echo inside second if with falsy condition': {
            code: nowdoc(function () {/*<<<EOS
<?php
    goto end;
    echo 'first';

    if (true) {
        echo 'second';
    }

    if (0) {
        echo 'third';
end:
        echo 'fourth';
    }
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'fourth'
        },
        'jumping out of if statement': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    if (true) {
        echo 'second';
        goto end;
        echo 'third';
    }

    echo 'fourth';

end:
    echo 'fifth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondfifth'
        },
        'jumping out of first if statement to echo inside second if': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    if (true) {
        echo 'second';
        goto sixth;
        echo 'third';
    }

    echo 'fourth';

    if (0) {
        echo 'fifth';
sixth:
        echo 'sixth';
    }

    echo 'seventh';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondsixthseventh'
        },
        'jumping forward into nested if': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    goto end;

    echo 'second';

    if (0) {
        echo 'third';
        if (0) {
            echo 'fourth';
end:
            echo 'fifth';
        }
        echo 'sixth';
    }

    echo 'seventh';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstfifthsixthseventh'
        },
        'jumping backward into nested if': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    echo 'second';

    if (0) {
        echo 'third';
        if (0) {
            echo 'fourth';
end:
            echo 'fifth';
        }
        echo 'sixth';
        return;
    }

    echo 'seventh';
    goto end;
    echo 'eighth'; // Should never be reached
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondseventhfifthsixth'
        },
        'jumping forward out of nested if': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    if (true) {
        echo 'second';
        if (true) {
            echo 'third';
goto end;
            echo 'fourth';
        }
        echo 'fifth';
    }

    echo 'sixth';

end:
    echo 'seventh';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondthirdseventh'
        },
        'jumping backward out of nested if': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    if (false) {
end:
        echo 'second';
        return;
    }

    echo 'third';
    if (true) {
        echo 'fourth';
        if (true) {
            echo 'fifth';
goto end; // This is the backward jump
            echo 'sixth';
        }
        echo 'seventh';
    }

    echo 'eighth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstthirdfourthfifthsecond'
        },
        'jumping out of nested if into nested if': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    if (true) {
        echo 'second';
        if (true) {
            echo 'third';
goto end;
            echo 'fourth';
        }
        echo 'fifth';
    }

    echo 'sixth';

    if (false) {
        echo 'seventh';
        if (false) {
            echo 'eighth';
end:
            echo 'ninth';
        }
        echo 'tenth';
    }

    echo 'eleventh';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondthirdninthtentheleventh'
        },
        'jumping backward into if': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    if (0) {
        echo 'second';
backward:
        echo 'third';
        return;
        echo 'fourth';
    }

    echo 'fifth';
    goto backward;
    echo 'sixth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstfifththird'
        },
        'jumping backward from if into previous if': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    if (0) {
        echo 'second';
backward:
        echo 'third';
        return;
        echo 'fourth';
    }

    echo 'fifth';
    if (true) {
        echo 'sixth';
        goto backward;
        echo 'seventh';
    }
    echo 'eighth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstfifthsixththird'
        },
        'forward jump inside function': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    function doIt() {
        echo 'second';
        goto myLabel;
        echo 'third';
myLabel:
        echo 'fourth';
    }

    echo 'fifth';
    doIt();
    echo 'sixth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstfifthsecondfourthsixth'
        },
        'reusing label name inside function': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    function doIt() {
        echo 'second';
        goto myLabel;
        echo 'third';
myLabel:
        echo 'fourth';
    }

    echo 'fifth';
    doIt();
    echo 'sixth';

    goto myLabel;
    echo 'seventh';
myLabel:
    echo 'eighth';

EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstfifthsecondfourthsixtheighth'
        },
        'a jump into an if statement consequent clause when there is also a backward jump inside': {
            code: nowdoc(function () {/*<<<EOS
<?php
    $done = false;
    print 'first';
    goto my_label;

    print 'second';

    if (false) { // Must be falsy to ensure the condition is changed to allow execution through
        print 'third';

my_label:
        print 'fourth';

        if ($done) {
            print 'fifth';
            return;
            print 'sixth';
        }

        print 'seventh';
        $done = true;
        print 'eighth';
        goto my_label;
        print 'ninth';
    }

    print 'tenth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstfourthseventheighthfourthfifth'
        },
        'overlapping forward gotos': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    goto first_label;

    echo 'second';
    goto second_label;
first_label:
    echo 'third';

    echo 'fourth';
second_label:
    echo 'fifth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstthirdfourthfifth'
        },
        'looping by jumping with the same goto multiple times': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';

    $i = 0;
loop:
    echo 'second';
    $i++;
    echo 'third';

    if ($i < 4) {
        echo 'fourth';
        goto loop;
    }

    echo 'fifth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondthirdfourthsecondthirdfourthsecondthirdfourthsecondthirdfifth'
        },
        'overlapping forward and backward gotos': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    goto second_label;

    echo 'second';
first_label:
    echo 'third';
    return; // Stop so we don't infinitely loop
second_label:

    echo 'fourth';

    goto first_label;
    echo 'fifth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstfourththird'
        },
        'forward, backward then forward jump with overlapping gotos and some nested blocks': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    goto second_label;

    echo 'second';

    if (true) {
        echo 'third';
first_label:
        echo 'fourth';
        goto third_label;
        echo 'fifth';
    }

    echo 'sixth';

    if (true) {
        echo 'seventh';
        if (true) {
            echo 'eighth';
second_label:
            echo 'ninth';
            goto first_label;
        }
        echo 'tenth';
    }

    echo 'eleventh';
third_label:
    echo 'twelfth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstninthfourthtwelfth'
        },
        'multiple forward gotos for the same label at the root level': {
            code: nowdoc(function () {/*<<<EOS
<?php
    print 'first';
    goto end;

    print 'second';
    goto end;

    print 'third';

end:
    print 'fourth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstfourth'
        },
        'multiple forward gotos for the same label nested inside blocks': {
            code: nowdoc(function () {/*<<<EOS
<?php
    $counter = 0;

next_one:
    if ($counter === 0) {
        print 'first:';
        goto output_it;
    } elseif ($counter === 1) {
        print 'second:';
        goto output_it;
    } else {
        print '[done]';
        return;
    }

output_it:
    $counter++;
    print "[counter:$counter]";
    goto next_one;
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'first:[counter:1]second:[counter:2][done]'
        },
        'multiple backward gotos for the same label at the root level': {
            code: nowdoc(function () {/*<<<EOS
<?php
    print 'first';

    if (false) {
        print 'second';
start:
        print 'third';
        return; // Stop so we don't infinitely loop
        print 'fourth';
    }

    print 'fifth';
    goto start;

    print 'sixth';
    goto start;

    print 'seventh';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstfifththird'
        },
        'multiple backward gotos for the same label nested inside blocks': {
            code: nowdoc(function () {/*<<<EOS
<?php
    $counter = 0;

    if (false) {
output_it:
        $counter++;
        print "[counter:$counter]";
    }

    if ($counter === 0) {
        print 'first:';
        goto output_it;
    } elseif ($counter === 1) {
        print 'second:';
        goto output_it;
    } else {
        print '[done]';
        return;
    }

EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'first:[counter:1]second:[counter:2][done]'
        },
        // Check that the `continue_` prefix used for the backward jump loop doesn't collide
        'forward and backward gotos where the forward-goto label happens to begin with "continue_"': {
            code: nowdoc(function () {/*<<<EOS
<?php
    print 'first';
    goto continue_my_label;

    print 'second';
continue_my_label:
    print 'third';

    if (false) {
        print 'fourth';
my_label:
        print 'fifth';
        return;
        print 'sixth';
    }

    print 'seventh';
    goto my_label;
    print 'eighth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstthirdseventhfifth'
        },
        'jumping within a while loop': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    $i = 0;

    while ($i++ < 2) {
        echo 'second';
        goto my_label;

        echo 'third';
        return;
my_label:
        echo 'fourth';
    }
    echo 'fifth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondfourthsecondfourthfifth'
        },
        'jumping forward out of while loop': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    $i = 0;

    while ($i < 10) {
        echo 'second';
        $i++;

        echo 'third';
        if ($i === 2) {
            echo 'fourth';
            goto done;
            echo 'fifth';
        }
        echo 'sixth';
    }
    echo 'seventh';

done:
    echo 'eighth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondthirdsixthsecondthirdfourtheighth'
        },
        'jumping backward out of while loop': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    $i = 0;

    echo 'second';
    if (false) {
        echo 'third';
done:
        echo 'fourth';
        return;
        echo 'fifth';
    }

    while ($i < 10) {
        echo 'sixth';
        $i++;

        echo 'seventh';
        if ($i === 2) {
            echo 'eighth';
            goto done;
            echo 'ninth';
        }
        echo 'tenth';
    }
    echo 'eleventh';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondsixthseventhtenthsixthseventheighthfourth'
        },
        'jumping forward out of switch': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    $i = 21;

    echo 'second';

    switch ($i) {
    case 0:
        echo 'third';
        break;
    case 21:
        echo 'fourth';

        if (true) {
            echo 'fifth';
            goto done;
            echo 'sixth';
        }
        echo 'seventh';
    }
    echo 'eighth';

done:
    echo 'ninth';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondfourthfifthninth'
        },
        'jumping backward out of switch': {
            code: nowdoc(function () {/*<<<EOS
<?php
    echo 'first';
    $i = 21;

    echo 'second';
    if (false) {
        echo 'third';
done:
        echo 'fourth';
        return;
        echo 'fifth';
    }

    switch ($i) {
    case 0:
        echo 'sixth';
        break;
    case 21:
        echo 'seventh';

        if (true) {
            echo 'eighth';
            goto done;
            echo 'ninth';
        }
        echo 'tenth';
    }
    echo 'eleventh';
EOS
*/;}), // jshint ignore:line
            expectedStderr: '',
            expectedStdout: 'firstsecondseventheighthfourth'
        }
    }, function (scenario, description) {
        it(description, function () {
            var engine,
                module = tools.syncTranspile(null, scenario.code);

            engine = module();
            engine.execute();

            expect(engine.getStdout().readAll()).to.equal(scenario.expectedStdout);
            expect(engine.getStderr().readAll()).to.equal(scenario.expectedStderr);
        });
    });
});
