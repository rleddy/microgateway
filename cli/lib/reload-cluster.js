'use strict'

var cluster = require('cluster');
var EventEmitter = require('events').EventEmitter;
var cpuCount = require('os').cpus().length;
const cache = require('microgateway-plugins').memored;

const PURGE_INTERVAL = 60000;
//
const DEFAULT_PROCESS_CHECK_INTERVAL = 10000
const CALLBACK_TIMEOUT = 5000

//
var RLC = null;  // an instance if needed

/**
 * @param opt
 * @returns {RespawnIntervalManager}
 * @constructor
 */

class RespawnIntervalManager {
  //
  constructor(opt) {
    this.respawnInterval = opt.minRespawnInterval || 1;  // default to 1 sec
    this.lastSpawn = Date.now();
  }
  //
  getIntervalForNextSpawn(now) {
    var nextSpawn = Math.max(now, (this.lastSpawn + (this.respawnInterval * 1000)))
    var intervalForNextSpawn = nextSpawn - now;
    this.lastSpawn = nextSpawn;
    return intervalForNextSpawn;
 }

}




/**
 * Decorator for holding respawn timers
 *
 * @constructor
 */
class TimerList {
  //
  constructor() {
    this.items = []
  }
  //
  clear() {
    this.items.forEach((item) => {
      clearTimeout(item);
    })
  }
  //
  add(id) {
    this.items.push(id)
  }
  //
  remove(id) {
    this.items.splice(this.items.indexOf(id),1)
  }
  //
}

var extantTimers = new TimerList();


var tClosers = {}
var tOpeners = {}


function cleanUpAllowedProcess() {  // walk through tracked processes
  var wmap = cluster.workers;
  for ( var wk in tOpeners ) {    // remove any processes that are dead and make room for new ones
    var w = tOpeners[wk]  // processes are not in tOpeners before they are 'online' and 'connected'
    if ( w.isDead() || !(w.isConnected()) ) {
     delete tOpeners[wk]
     if ( !(tClosers.hasOwnProperty(wk)) ) { // if the process is not already in the prune list then put it there.
        tClosers[wk] = wmap[wk]
      }
    }
  }
}


function closePreconditions() {
  return(true)
}


function clearOutStoppedProcesses() {
  if ( closePreconditions() ) {
    for ( var wk in tClosers ) {
      var w = tClosers[wk]
      if ( !(w.isDead()) && w.isConnected() ) {
        w.disconnect()  // from the IPC
      } else if ( !(w.isDead()) && !(w.isConnected()) ) {
        w.kill('SIGKILL')
      } else if ( w.isDead() ) {
        delete tClosers[wk]
      }
    }
    if ( Object.keys(tClosers).length === 0  ) {
      extantTimers.add(setTimeout(healthCheck,DEFAULT_PROCESS_CHECK_INTERVAL))
    } else {
      extantTimers.add(setTimeout(clearOutStoppedProcesses,50))
    }
    
  } else {
    extantTimers.add(setTimeout(clearOutStoppedProcesses,10))
  }
}



function untrackTrackedProcesses() {  // clear out tracked processes and put them in the die off list.
  //
  var wmap = cluster.workers;
  for ( var wk in tOpeners ) {    // remove any processes that are dead and make room for new ones
    delete tOpeners[wk]
    if ( !(tClosers.hasOwnProperty(wk)) ) { // if the process is not already in the prune list then put it there.
      tClosers[wk] = wmap[wk]
    }
  }
  //
}



function healthCheck() {
  clearOutStoppedProcesses()
  if ( RLC ) {
    var wantsmore = RLC.consonantProcesses();
    while ( wantsmore ) {
      RLC.requestNewWorker()
      wantsmore--;
    }
  }
}



const readyCommand = 'ready';

class ClusterManager extends EventEmitter {
  constructor(file,opt) {
    super()
    //
    this.opt = {}
    this.optionDefaults(opt)
    this.numWorkers = opt.workers
    //
    this.readyEvent = 'online'
    this.reloading = false
    this.callbackTO = null
    //
    //this.readyEvent = opt.workerReadyWhen === 'started' ? 'online' : opt.workerReadyWhen === 'listening' ? 'listening' : 'message';
    // // //
    this.initializeCache()
    this.setupClusterProcs(file)
    this.setUpClusterHandlers()

    setInterval(healthCheck,DEFAULT_PROCESS_CHECK_INTERVAL)  // once in a while check to see if everything is the way it is supposed to be
  }
  
  optionDefaults(opt) {
    // initializing opt with defaults if not provided
    this.numWorkers = this.numWorkers || cpuCount;
    this.opt.timeout = opt.timeout || 30; // default timeout for reload is set as 30 sec
    this.opt.workerReadyWhen = opt.workerReadyWhen || 'listening';
    this.opt.args = opt.args || [];
    this.opt.log = opt.log || {respawns: true};
    this.opt.respawnIntervalManager = new RespawnIntervalManager({minRespawnInterval: opt.minRespawnInterval});
  }

  initializeCache() {
    //setup memored - a cache shared between worker processes. intro in 2.5.9
    cache.setup({
      purgeInterval: PURGE_INTERVAL
    });
  }
  
  setupClusterProcs(file) {
    cluster.setupMaster({exec: file});
    cluster.settings.args = this.opt.args;
    //
    const argv = cluster.settings ? cluster.settings.execArgv || [] : [];
    if ( argv ) {
      argv.forEach((arg,j) => {
        if (arg.includes('--inspect-brk')) {
          argv[j] = arg.replace('--inspect-brk', '--inspect')
        }
      });
    }
    //
  }

  setUpClusterHandlers() {
    // Event handlers on the cluster
    // This exit event happens, whenever a worker exits.

    this.handleWorkerExit = (w) => {
      console.log(`handleWorkerExit ${w.id}`)
      var wantMore = this.consonantProcesses()
      nextTick(clearOutStoppedProcesses)
      while ( wantMore > 0 ) {
        this.requestNewWorker()
        wantMore--
      }
    }

    this.handleWorkerDisconnect = (w) => {
      console.log(`emitWorkerDisconnect ${w.id}`)
      setTimeout(healthCheck,50)
    }

    this.handleWorkerListening = (w, adr) => {
      console.log(`handleWorkerListening ${w.id}`)
      if ( this.readyEvent === 'listening' ) {
        this.handleReadyEvent(w)
      }
    }
  
    this.handleWorkerOnline = (w) => {
      console.log(`worker ${w.id} is online ...`)
      if ( this.readyEvent === 'online' ) {
        this.handleReadyEvent(w)
      }
    }
  
    //
    cluster.on('exit', this.handleWorkerExit );
    // This event is emitted when a worker IPC channel has disconnected
    cluster.on('disconnect', this.handleWorkerDisconnect );
    // Whenever a server.listen() is called in the worker, this event is emitted.
    cluster.on('listening', this.handleWorkerListening );
    // Whenever a worker goes online, this event is emitted.
    cluster.on('online', this.handleWorkerOnline);
    //
    cluster.on('message',(w, arg) => {
      if ( this.readyEvent === 'message' && (!arg || ( arg && arg.cmd === readyCommand ) )) {
        this.handleReadyEvent(w)
      } else if ( arg && arg.cmd === 'disconnect' ) {
                                  //replaceAndTerminateWorker(w);
      }
    })

  }

  callReloadCallback() {
    if ( (this.callbackTO !== undefined) && (this.callbackTO !== null) ) {
      clearTimeout(this.callbackTO)
      this.callbackTO = undefined
    }
    this.reloading = false;
    if ( this.readyCb !== undefined ) this.readyCb();
    this.readyCb = undefined
  }

  handleReloadReadyEvents() {
    if ( this.readyCb ) {
      //
      var wantMore = this.consonantProcesses()
      //
      nextTick(clearOutStoppedProcesses)
      //
      if ( !wantMore ) {
        this.callReloadCallback()
      } else { // Put out checkup out there to see if more is still wanted 
        this.callbackTO = setTimeout(() => {
            RLC.callbackTO = undefined
            RLC.callReloadCallback()
            setTimeout(healthCheck,100)
        },CALLBACK_TIMEOUT)
      }
    }
  }

  handleReadyEvent(w) {
    console.log(`HANDLING READY EVENT FOR ${w.id}`)
    if ( this.reloading ) {
      this.handleReloadReadyEvents()
    }
  }

  // -------------------------------------------------------

  // -------------------------------------------------------
  run() {
    this.forkWorkers()
  }

  reload(cb) {
    this.refreshCache()
    untrackTrackedProcesses()

    this.reloading = true
    this.readyCb = cb
    //
    // fork workers
    this.forkWorkers()
  }

  terminate(cb) {
    this.stop();
    cluster.disconnect(cb)  // kill after disconnect
  }

  stop() {
    if ( !cluster.isMaster ) return;
    cluster.removeListener('exit', this.handleWorkerExit);
    cluster.removeListener('disconnect', this.handleWorkerDisconnect);
    cluster.removeListener('listening', this.handleWorkerListening);
    cluster.removeListener('online', this.handleWorkerOnline);
    this.stopExtantTimers()
    channel.removeAllListeners();
  }

  stopExtantTimers() {
    extantTimers.clear()
  }

  // ----------------------------------------- 
  forkWorkers() {
    for (var i = 0; i < this.numWorkers; i++) {
      this.requestNewWorker()
    }
  }

  // ----------------------------------------- 
  // at any time, this should be able to check on the 
  // known child processes and see if they are accounted for.
  // ----------------------------------------- 
  consonantProcesses() {   // walk through the cluster worker list
    //
    cleanUpAllowedProcess()
    //
    var wmap = cluster.workers;
    for ( var wk in wmap ) {
      if ( !(tOpeners.hasOwnProperty(wk)) ) {
        var w = wmap[wk];
        var nW = Object.keys(tOpeners).length
        if ( (nW < this.numWorkers ) && !(w.isDead()) && w.isConnected() ) {  // if it is working and not tracked, then track it unless maxed out
          tOpeners[wk] = w
        } else if ( !(tClosers.hasOwnProperty(wk)) ) { // if the process is not already in the prune list then put it there.
          tClosers[wk] = wmap[wk]
        }
      }
    }
    //
    var nW = Object.keys(tOpeners).length
    var unborn = this.numWorkers - nW;
    //
    return unborn
  }




  // --requestNewWorker--------------------------------------- 
  // At any time, this should be able to ask for a new worker and have that request be accepted or rejected
  // depending on our criteria.
  // Here, there are some number of processes needed, but no more.
  // ----------------------------------------- 
  requestNewWorker() {
    var nW = Object.keys(tOpeners).length
    if ( nW < this.numWorkers ) {
      var wmap = cluster.workers;
      for ( var wk in wmap ) {
        var w = wmap[wk]
        if ( !(tOpeners.hasOwnProperty(wk)) && !(w.isDead()) && w.isConnected() ) {
          if ( !(tClosers.hasOwnProperty(wk)) ) {
            tOpeners[wk] = w
            return;  
          }
        }
      }
      // no excess processes needing a home
      this.doFork()  
    }
  }


  // ----------------------------------------- 
  refreshCache() {
    cache.clean(function(){});
  }
  
  
  // ----------------------------------------- 
  doFork() {
    //
    var nW = this.numWorkers  
    if ( Object.keys(tOpeners).length < nW ) {
  
      var w = cluster.fork() //{WORKER_ID: wid});
      //  
      tOpeners[w.id] = w;
      //
      // whenever worker sends a message, emit it to the channels
      w.on('message', (message) => {
        if ( this.opt.logger ) {
          this.opt.logger.writeLogRecord(message);
        }
        this.emit('message', w, message);
      });
      //
      // When a worker exits remove the worker reference from workers array, which holds all the workers
      //w.process.on('exit', () => {
      //});
      //
    }
  }
  
}


// ---- ---- ---- ---- ---- ---- ----
module.exports = (file,opt) => {
  RLC = new ClusterManager(file,opt);
  return( RLC )
}


