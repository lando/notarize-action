'use strict';
/* eslint-env jest */

const {spawnSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// PATH contains only these fake tools. No Apple upload or signing is performed,
// and the archive command deliberately does not touch the shared /tmp/archive.zip.
const fakeTool = `#!${process.execPath}
const fs = require('fs');
const path = require('path');
const tool = path.basename(process.argv[1]);
fs.appendFileSync(process.env.COMMAND_LOG, JSON.stringify([tool, ...process.argv.slice(2)]) + '\\n');
if (tool === 'ditto') process.exit(process.env.MODE === 'archive-failure' ? 1 : 0);
if (tool !== 'xcrun') process.exit(99);
if (process.env.MODE === 'notary-failure') {
  console.log(JSON.stringify({status: 'Invalid', message: 'Fixture rejected'}));
  process.exit(1);
}
console.log(JSON.stringify({status: 'Accepted', message: 'Fixture accepted'}));
`;

const runAction = (entry, mode = 'success') => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'notarize-offline-'));
  try {
    const binaryDirectory = path.join(directory, 'bin');
    fs.mkdirSync(binaryDirectory);
    for (const tool of ['ditto', 'xcrun']) {
      fs.writeFileSync(path.join(binaryDirectory, tool), fakeTool, {mode: 0o755});
    }
    const product = path.join(directory, 'fixture');
    const output = path.join(directory, 'output');
    const commandLog = path.join(directory, 'commands');
    fs.writeFileSync(product, 'Unsigned local test fixture');
    fs.writeFileSync(output, '');
    fs.writeFileSync(commandLog, '');
    let action = path.resolve(__dirname, '..', entry);
    if (entry === 'dist/index.js') {
      // Run the shipped bundle outside the checkout: it cannot silently fall back
      // to this repository's node_modules or unbundled source files.
      fs.cpSync(path.resolve(__dirname, '..', 'dist'), path.join(directory, 'dist'), {recursive: true});
      action = path.join(directory, 'dist', 'index.js');
    }
    const result = spawnSync(process.execPath, [action], {
      encoding: 'utf8', timeout: 10000,
      env: {
        'PATH': binaryDirectory, 'MODE': mode, 'COMMAND_LOG': commandLog, 'GITHUB_OUTPUT': output,
        'INPUT_PRODUCT-PATH': mode === 'missing-file' ? path.join(directory, 'missing') : product,
        'INPUT_APPSTORE-CONNECT-USERNAME': mode === 'missing-input' ? '' : 'fixture@example.invalid',
        'INPUT_APPSTORE-CONNECT-PASSWORD': 'dummy-not-a-credential',
        'INPUT_APPSTORE-CONNECT-TEAM-ID': 'FIXTURETEAM',
        'INPUT_PRIMARY-BUNDLE-ID': 'dev.lando.fixture',
        'INPUT_TOOL': mode === 'unsupported' ? 'invalid-tool' : 'notarytool',
        'INPUT_VERBOSE': 'false',
      },
    });
    if (result.error) throw result.error;
    return {
      ...result, product, output: fs.readFileSync(output, 'utf8'),
      commands: fs.readFileSync(commandLog, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)),
    };
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
};

describe.each(['notarize-action.js', 'dist/index.js'])('%s (fake macOS tools only)', entry => {
  test('archives, submits with notarytool, and writes the product output', () => {
    const result = runAction(entry);
    expect(result.status).toBe(0);
    expect(result.commands).toEqual([
      ['ditto', '-c', '-k', '--keepParent', result.product, '/tmp/archive.zip'],
      ['xcrun', 'notarytool', 'submit', '/tmp/archive.zip', '--apple-id', 'fixture@example.invalid',
        '--password', 'dummy-not-a-credential', '--team-id', 'FIXTURETEAM', '--output-format', 'json', '--wait'],
    ]);
    expect(result.output).toContain('product-path');
    expect(result.output).toContain(result.product);
  });

  test.each([
    ['missing-input', 'Input required and not supplied'],
    ['missing-file', 'does not exist'],
    ['unsupported', 'is not a supported tool'],
    ['archive-failure', 'Notarization failed'],
    ['notary-failure', 'Fixture rejected'],
  ])('fails without a success output: %s', (mode, message) => {
    const result = runAction(entry, mode);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(message);
    expect(result.output).toBe('');
    if (['missing-input', 'missing-file', 'unsupported'].includes(mode)) expect(result.commands).toEqual([]);
    if (mode === 'archive-failure') expect(result.commands.map(command => command[0])).toEqual(['ditto']);
  });
});
