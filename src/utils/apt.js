
var _ = require('underscore');
var events = require('events');
var exec = require('child_process').exec;
var util = require('util');

var _path = {};

/**
 * Get or set the path for a binary alias
 */
var path = module.exports.path = function(alias, path) {
    if (path) {
        _path[alias] = path;
    }
    return _path[alias] || alias;
};

/**
 * Show the currently installed version of the module using dpkg -s
 */
var show = module.exports.show = async function(name, callback) {
  return new Promise((resolve,reject)=>{
    exec(util.format('%s -s %s', path('dpkg'), name), function(err, stdout, stderr) {
      if(err){
        const notFoundMsg = 'dpkg-query: package \''+name+'\' is not installed'
        const notFound = err.message.indexOf(notFoundMsg) > -1

        if(!notFound){
          err.stdout = stdout
          err.stderr = stderr
          return reject(err)
        }
      }

      let parsedOutput = _parseOutput(stdout)

      resolve({
        parsed: parsedOutput,
        stdout: stdout,
        stderr: stderr
      })
    });
  })
};

/**
 * Update the apt cache using apt-get update
 */
var update = module.exports.update = async function() {
  return new Promise((resolve,reject)=>{
    var child = exec(/*'sudo ' +*/ util.format('%s update', path('apt-get')), function(err, stdout, stderr) {
      if(err){
        err.stdout = stdout
        err.stderr = stderr
        return reject(err)
      }

      return resolve({ stdout, stderr })
    })
  })
};

/**
 * Install the module with the given name, optionally with the given version
 *
 * @param   {String}    name                The name of the module to install (e.g., redis-server)
 * @param   {String}    [version]           The version of the module to install
 * @param   {Object}    [options]           Invokation arguments
 * @param   {Boolean}   [options.confnew]   If `true` and a module is being upgraded, existing configurations will be overwritten. Default: `false`
 * @param   {Function}  [callback]          Invoked when installation is complete
 * @param   {Error}     [callback.err]      An error that occurred, if any
 * @param   {Object}    [callback.package]  The package definition (from `show`) of the module that was installed
 */
var install = module.exports.install = async function(name, version=null, options=null) {
  if (version) {
    name = util.format('%s=%s', name, version);
  }

  options = options || {};
  var forceConf = (options.confnew) ? 'new' : 'old';
  
  return new Promise((resolve,reject)=>{
    var child = exec(/*'sudo ' +*/ util.format('%s install -y -o Dpkg::Options::="--force-conf%s" %s', path('apt-get'), forceConf, name),
      async function(err, stdout, stderr) {
        if(err){
          err.stdout = stdout
          err.stderr = stderr
          return reject(err)
        }

        resolve({ stdout, stderr })

        /*show(name)
          .then((value)=>{
            resolve({ stdout, stderr, show: value })
          })
          .catch(reject)*/
      }
    )
  })
}

/**
 * Uninstall the package with the given name
 */
var uninstall = module.exports.uninstall = async function(name) {
  return new Promise((resolve,reject)=>{
    let child = exec(/*'sudo ' +*/ util.format('%s remove -y %s', path('apt-get'), name), (err, stdout, stderr)=>{

      if(err){
        err.stdout = stdout
        err.stderr = stderr
        return reject(err)
      }

      return resolve({ stdout, stderr })
    })
  })
}

/*const LogOutput = (emitter)=>{
  return new Promise((resolve,reject)=>{
    let stdout = ''
    let sderr = ''

    emitter.once('exit', ()=>{
      emitter.removeAllListeners('done')
      emitter.removeAllListeners('stdout')
      emitter.removeAllListeners('stderr')
      resolve({stdout, stderr})
    })

    emitter.on('stderr', (data)=>{ stderr = stderr.concat(data) })
    emitter.on('stdout', (data)=>{ stdout = stderr.concat(data) })
  })
}*/

var _parseOutput = function(output) {
    output = output || '';
    if (!output.trim()) {
        return undefined;
    }

    var parsed = {};
    var currKey = null;
    var currValue = '';
    output = output.split('\n');
    _.each(output, function(line) {
        if (line[0] !== ' ') {
            // This is a new key
            if (currKey) {
                parsed[currKey] = currValue;
            }

            // Start the curr* variables for the next key
            line = line.split(':');
            currKey = line.shift();
            currValue = line.join(':').trim();
        } else if (line === ' .') {
            // The literal " ." indicates a new paragraph
            currValue += '\n\n';
        } else {
            currValue += line.trim();
        }
    });

    // Apply the last key
    if (currKey) {
        parsed[currKey] = currValue;
    }

    if(parsed == {}){
      return undefined
    }

    return parsed;
};
