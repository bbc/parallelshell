#!/usr/bin/env node

'use strict';
var spawn = require('child_process').spawn;

var children, args, wait, dontWaitLast, cmds, verbose, i ,len;
// parsing argv
cmds = [];
args = process.argv.slice(2);
for (i = 0, len = args.length; i < len; i++) {
    if (args[i][0] === '-') {
        switch (args[i]) {
            case '-w':
            case '--wait':
                wait = true;
                break;
            case '-d':
            case '--dont-wait-last':
                dontWaitLast = true;
                wait = false;
                break;
            case '-v':
            case '--verbose':
                verbose = true;
                break;
            case '-h':
            case '--help':
                console.log('-h, --help            output usage information');
                console.log('-v, --verbose         verbose logging')
                console.log('-w, --wait            will not close sibling processes on error')
                console.log('-d, --dont-wait-last  always close sibling prorcesses when the last process exits');
                process.exit();
                break;
        }
    } else {
        cmds.push(args[i]);
    }
}

// called on close of a child process
function childClose (code) {
    var i, len;
    code = code ? (code.code || code) : code;
    if (verbose) {
        if (code > 0) {
            console.error('`' + this.cmd + '` failed with exit code ' + code);
        } else {
            console.log('`' + this.cmd + '` ended successfully');
        }
    }
    if (code > 0 && !wait) close(code);
    if (dontWaitLast && this.lastProcess) close(code);
    status();
}

function status () {
    if (verbose) {
        var i, len;
        console.log('\n');
        console.log('### Status ###');
        for (i = 0, len = children.length; i < len; i++) {
            if (children[i].exitCode === null) {
                console.log('`' + children[i].cmd + '` is still running');
            } else if (children[i].exitCode > 0) {
                console.log('`' + children[i].cmd + '` errored');
            } else {
                console.log('`' + children[i].cmd + '` finished');
            }
        }
        console.log('\n');
    }
}

// closes all children and the process
function close (code) {
    var i, len, closed = 0, opened = 0;

    for (i = 0, len = children.length; i < len; i++) {
        if (!children[i].exitCode) {
            opened++;
            children[i].removeAllListeners('close');
            children[i].on('close', function() {
                closed++;
                if (opened == closed) {
                    process.exit(code);
                }
            });
            if (verbose) console.log('`' + children[i].cmd + '` will now be closed');
            children[i].kill("SIGINT");
        }
    }
    if (opened == closed) {process.exit(code);}

}

// start the children
children = [];
let lastElement = cmds.length - 1;
cmds.forEach(function (cmd, index) {
    if (process.platform != 'win32') {
      cmd = "exec "+cmd;
    }
    var child = spawn(cmd, [], {
        cwd: process.cwd,
        env: process.env,
        stdio: ['pipe', process.stdout, process.stderr],
        shell: true
    })
    .on('close', childClose);
    child.cmd = cmd;
    child.lastProcess = (lastElement === index);
    children.push(child)
});

// close all children on ctrl+c
process.on('SIGINT', close)
