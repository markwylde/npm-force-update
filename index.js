#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const axios = require('axios');

function update (type, infos) {
  fs.unlinkSync(path.join(process.cwd(), './package-lock.json'));

  const repos = infos
    .map(info => info.name + '@' + info['dist-tags'].latest);

  if (type === 'dev') {
    childProcess.execSync('npm install --save-dev ' + repos.join(' '), { stdio: [0, 1, 2] });
    return;
  }

  childProcess.execSync('npm install --save ' + repos.join(' '), { stdio: [0, 1, 2] });
}

async function getInfos (type) {
  const packageJson = require(path.join(process.cwd(), './package.json'));
  const infosPromises = Object
    .keys(packageJson[type])
    .map(item => {
      return axios('http://registry.npmjs.org/' + item);
    });

  const infos = (await Promise.all(infosPromises))
    .map(response => response.data);

  return infos;
}

async function main () {
  const dependencies = await getInfos('dependencies');
  update('prod', dependencies);

  const devDependencies = await getInfos('devDependencies');
  update('dev', devDependencies);
}

main();
