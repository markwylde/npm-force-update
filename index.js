#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const axios = require('axios');

function update (type, infos) {
  try {
    fs.unlinkSync(path.join(process.cwd(), './package-lock.json'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

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
  
  if (!packageJson[type]) {
    return []
  }

  const infosPromises = Object
    .keys(packageJson[type])
    .map(item => {
      const registry = item.includes('/')
        ? childProcess.execSync(`npm config get ${item.split('/')[0]}:registry`).toString().trim()
        : 'http://registry.npmjs.org'

      return axios(registry + '/' + item)
        .catch(error => {
          console.log({
            url: error.response.config.url,
            status: error.response.status,
            body: error.response.body
          })
          throw error
        })
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
