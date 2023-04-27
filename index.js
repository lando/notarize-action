'use strict';

const fs = require('fs');

const core = require('@actions/core');
const execa = require('execa');
const plist = require('plist');

const sleep = ms => {
  return new Promise(res => setTimeout(res, ms));
};

const parseConfiguration = () => {
  const configuration = {
    productPath: core.getInput('product-path', {required: true}),
    username: core.getInput('appstore-connect-username', {required: true}),
    password: core.getInput('appstore-connect-password', {required: true}),
    primaryBundleId: core.getInput('primary-bundle-id'),
    tool: core.getInput('tool'),
    verbose: core.getInput('verbose') === 'true',
  };

  // require the team-id for notarytool
  configuration.team = core.getInput('appstore-connect-team-id', {required: configuration.tool === 'notarytool'});

  if (!fs.existsSync(configuration.productPath)) {
    throw Error(`Product path ${configuration.productPath} does not exist.`);
  }

  return configuration;
};

const archive = async ({productPath}) => {
  const archivePath = '/tmp/archive.zip'; // TODO Temporary file

  const args = [
    '-c', // Create an archive at the destination path
    '-k', // Create a PKZip archive
    '--keepParent', // Embed the parent directory name src in dst_archive.
    productPath, // Source
    archivePath, // Destination
  ];

  try {
    await execa('ditto', args);
  } catch (error) {
    core.error(error);
    return null;
  }

  return archivePath;
};


const submitNotaryTool = async ({productPath, archivePath, primaryBundleId, username, password, team, verbose}) => {
  //
  // Make sure the product exists.
  //

  if (!fs.existsSync(productPath)) {
    throw Error(`No product could be found at ${productPath}`);
  }

  //
  // The notarization process requires us to submit a 'primary
  // bundle id' - this is just a unique identifier for notarizing
  // this specific product. If it is not provided then we simply
  // use the actual bundle identifier from the Info.plist
  //

  if (primaryBundleId === '') {
    const path = productPath + '/Contents/Info.plist';
    if (fs.existsSync(path)) {
      const info = plist.parse(fs.readFileSync(path, 'utf8'));
      primaryBundleId = info.CFBundleIdentifier;
    }
  }

  if (primaryBundleId === null) {
    throw Error('No primary-bundle-id set and could not determine bundle identifier from product.');
  }

  //
  // Run altool to notarize this application. This only submits the
  // application to the queue on Apple's server side. It does not
  // actually tell us if the notarization was succesdful or not, for
  // that we need to poll using the request UUID that is returned.
  //

  // xcrun notarytool submit YourFile.dmg --apple-id yourmail@yourmail.com --team-id YOURTEAMID --password yourpassword --wait

  const args = [
    'notarytool',
    'submit',
    archivePath,
    '--apple-id', username,
    '--password', password,
    '--team-id', team,
    '--wait',
  ];

  if (verbose === true) {
    args.push('--verbose');
  }

  const xcrun = execa('xcrun', args, {reject: false});

  if (verbose == true) {
    xcrun.stdout.pipe(process.stdout);
    xcrun.stderr.pipe(process.stderr);
  }

  const {exitCode, stdout} = await xcrun;

  if (exitCode === undefined) {
    throw Error('Unknown failure - notarytool did not run at all?');
  }

  if (exitCode !== 0) {
    const response = JSON.parse(stdout);
    if (verbose === true) {
      console.log(response);
    }

    for (const productError of response['product-errors']) {
      core.error(`${productError.code} - ${productError.message}`);
    }
    return null;
  }

  const response = JSON.parse(stdout);
  if (verbose === true) {
    console.log(response);
  }

  return response;
};


const submitAltool = async ({productPath, archivePath, primaryBundleId, username, password, verbose}) => {
  //
  // Make sure the product exists.
  //

  if (!fs.existsSync(productPath)) {
    throw Error(`No product could be found at ${productPath}`);
  }

  //
  // The notarization process requires us to submit a 'primary
  // bundle id' - this is just a unique identifier for notarizing
  // this specific product. If it is not provided then we simply
  // use the actual bundle identifier from the Info.plist
  //

  if (primaryBundleId === '') {
    const path = productPath + '/Contents/Info.plist';
    if (fs.existsSync(path)) {
      const info = plist.parse(fs.readFileSync(path, 'utf8'));
      primaryBundleId = info.CFBundleIdentifier;
    }
  }

  if (primaryBundleId === null) {
    throw Error('No primary-bundle-id set and could not determine bundle identifier from product.');
  }

  //
  // Run altool to notarize this application. This only submits the
  // application to the queue on Apple's server side. It does not
  // actually tell us if the notarization was succesdful or not, for
  // that we need to poll using the request UUID that is returned.
  //

  const args = [
    'altool',
    '--output-format', 'json',
    '--notarize-app',
    '-f', archivePath,
    '--primary-bundle-id', primaryBundleId,
    '-u', username,
    '-p', password,
  ];

  if (verbose === true) {
    args.push('--verbose');
  }

  const xcrun = execa('xcrun', args, {reject: false});

  if (verbose == true) {
    xcrun.stdout.pipe(process.stdout);
    xcrun.stderr.pipe(process.stderr);
  }

  const {exitCode, stdout} = await xcrun;

  if (exitCode === undefined) {
    // TODO Command did not run at all
    throw Error('Unknown failure - altool did not run at all?');
  }

  if (exitCode !== 0) {
    // TODO Maybe print stderr - see where that ends up in the output? console.log("STDERR", stderr);
    const response = JSON.parse(stdout);
    if (verbose === true) {
      console.log(response);
    }

    for (const productError of response['product-errors']) {
      core.error(`${productError.code} - ${productError.message}`);
    }
    return null;
  }

  const response = JSON.parse(stdout);
  if (verbose === true) {
    console.log(response);
  }

  return response['notarization-upload']['RequestUUID'];
};

const waitAltool = async ({uuid, username, password, verbose}) => {
  const args = [
    'altool',
    '--output-format', 'json',
    '--notarization-info',
    uuid,
    '-u', username,
    '-p', password,
  ];

  if (verbose === true) {
    args.push('--verbose');
  }

  for (let i = 0; i < 10; i++) {
    const xcrun = execa('xcrun', args, {reject: false});

    if (verbose == true) {
      xcrun.stdout.pipe(process.stdout);
      xcrun.stderr.pipe(process.stderr);
    }

    const {exitCode, stdout} = await xcrun;

    if (exitCode === undefined) {
      // TODO Command did not run at all
      throw Error('Unknown failure - altool did not run at all?');
    }

    if (exitCode !== 0) {
      // TODO Maye print stderr - see where that ends up in the output? console.log("STDERR", stderr);
      const response = JSON.parse(stdout);
      if (verbose === true) {
        console.log(response);
      }

      for (const productError of response['product-errors']) {
        core.error(`${productError.code} - ${productError.message}`);
      }
      return false;
    }

    const response = JSON.parse(stdout);
    if (verbose === true) {
      console.log(response);
    }

    const notarizationInfo = response['notarization-info'];
    switch (notarizationInfo['Status']) {
      case 'in progress':
        core.info(`Notarization status <in progress>`);
        break;
      case 'invalid':
        core.error(`Notarization status <invalid> - ${notarizationInfo['Status Message']}`);
        return false;
      case 'success':
        core.info(`Notarization status <success>`);
        return true;
      default:
        core.error(`Notarization status <${notarizationInfo['Status']}> - TODO`);
        return false;
    }

    await sleep(30000);
  }

  core.error('Failed to get final notarization status on time.');

  return false;
};

const main = async () => {
  try {
    const configuration = parseConfiguration();

    const archivePath = await core.group('Archiving Application', async () => {
      const archivePath = await archive(configuration);
      if (archivePath !== null) {
        core.info(`Created application archive at ${archivePath}`);
      }
      return archivePath;
    });

    if (archivePath == null) {
      core.setFailed('Notarization failed');
      return;
    }

    // altool logix
    if (configuration.tool === 'altool') {
      const uuid = await core.group('Notarizing with altool', async () => {
        const uuid = await submitAltool({archivePath: archivePath, ...configuration});
        if (uuid !== null) {
          core.info(`Submitted package for notarization. Request UUID is ${uuid}`);
        }
        return uuid;
      });

      if (uuid == null) {
        core.setFailed('Notarization failed');
        return;
      }

      await sleep(15000); // TODO On a busy day, it can take a while before the build can be checked?

      const success = await core.group('Waiting for Notarization Status', async () => {
        return await waitAltool({uuid: uuid, archivePath: archivePath, ...configuration});
      });

      if (success == false) {
        core.setFailed('Notarization failed');
        return;
      }

    // notarytool logix
    } else if (configuration.tool === 'notarytool') {
      const response = await core.group('Notarizing with notarytool', async () => {
        return await submitNotaryTool({archivePath: archivePath, ...configuration});
      });

      console.log(response);
      console.log('hi bob!');

      if (uuid == null) {
        core.setFailed('Notarization failed');
        return;
      }

      await sleep(15000); // TODO On a busy day, it can take a while before the build can be checked?

      if (success == false) {
        core.setFailed('Notarization failed');
        return;
      }
    }

    // finish by setting outputs
    core.setOutput('product-path', configuration.productPath);

  // catch unexpected
  } catch (error) {
    core.setFailed(`Notarization failed with an unexpected error: ${error.message}`);
  }
};


main();
