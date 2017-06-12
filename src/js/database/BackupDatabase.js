(function () {
  var ns = $.namespace('pskl.database');

  var DB_NAME = 'PiskelSessionsDatabase';
  var DB_VERSION = 1;

  var _requestPromise = function (req) {
    var deferred = Q.defer();
    req.onsuccess = deferred.resolve.bind(deferred);
    req.onerror = deferred.reject.bind(deferred);
    return deferred.promise;
  };

  ns.BackupDatabase = function (options) {
    options = options || {};

    this.db = null;
    this.onUpgrade = options.onUpgrade;
  };

  ns.BackupDatabase.prototype.init = function () {
    this.initDeferred_ = Q.defer();

    var request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = this.onRequestError_.bind(this);
    request.onsuccess = this.onRequestSuccess_.bind(this);
    request.onupgradeneeded = this.onUpgradeNeeded_.bind(this);

    return this.initDeferred_.promise;
  };

  ns.BackupDatabase.prototype.onRequestError_ = function (event) {
    console.log('Could not initialize the piskel backup database');
    this.initDeferred_.reject();
  };

  ns.BackupDatabase.prototype.onRequestSuccess_ = function (event) {
    this.db = event.target.result;
    this.initDeferred_.resolve(this.db);
  };

  ns.BackupDatabase.prototype.onUpgradeNeeded_ = function (event) {
    // Set this.db early to allow migration scripts to access it in oncomplete.
    this.db = event.target.result;

    // Create an object store "piskels" with the autoIncrement flag set as true.
    var objectStore = this.db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement : true });

    objectStore.createIndex('session_id', 'session_id', { unique: false });
    objectStore.createIndex('date', 'date', { unique: false });
    objectStore.createIndex('session_id, date', ['session_id', 'date'], { unique: false });

    objectStore.transaction.oncomplete = function(event) {
      if (typeof this.onUpgrade == 'function') {
        this.onUpgrade(this.db);
      }
    }.bind(this);
  };

  ns.BackupDatabase.prototype.openObjectStore_ = function () {
    return this.db.transaction(['snapshots'], 'readwrite').objectStore('snapshots');
  };

  ns.BackupDatabase.prototype.createSnapshot = function (snapshot) {
    var objectStore = this.openObjectStore_();
    var request = objectStore.add(snapshot);
    return _requestPromise(request);
  };

  ns.BackupDatabase.prototype.replaceSnapshot = function (snapshot, replacedSnapshot) {
    snapshot.id = replacedSnapshot.id;

    var objectStore = this.openObjectStore_();
    var request = objectStore.put(snapshot);
    return _requestPromise(request);
  };

  ns.BackupDatabase.prototype.deleteSnapshot = function (snapshot) {
    var objectStore = this.openObjectStore_();
    var request = objectStore.delete(snapshot.id);
    return _requestPromise(request);
  };

  ns.BackupDatabase.prototype.findLastSnapshot = function (accept) {
    // Create the backup promise.
    var deferred = Q.defer();

    // Open a transaction to the snapshots object store.
    var objectStore = this.db.transaction(['snapshots']).objectStore('snapshots');

    var index = objectStore.index('date');
    var range = IDBKeyRange.upperBound(Infinity);
    index.openCursor(range, 'prev').onsuccess = function(event) {
      var cursor = event.target.result;
      var snapshot = cursor && cursor.value;

      // Resolve null if we couldn't find a matching snapshot.
      if (!snapshot) {
        deferred.resolve(null);
      } else if (accept(snapshot)) {
        deferred.resolve(snapshot);
      } else {
        cursor.continue();
      }
    };

    return deferred.promise;
  };

  ns.BackupDatabase.prototype.getSnapshotsBySessionId = function (sessionId) {
    // Create the backup promise.
    var deferred = Q.defer();

    // Open a transaction to the snapshots object store.
    var objectStore = this.db.transaction(['snapshots']).objectStore('snapshots');

    // Loop on all the saved snapshots for the provided piskel id
    var index = objectStore.index('session_id, date');
    var keyRange = IDBKeyRange.bound(
      [sessionId, 0],
      [sessionId, Infinity]
    );

    var snapshots = [];
    // Ordered by date in descending order.
    index.openCursor(keyRange, 'prev').onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        snapshots.push(cursor.value);
        cursor.continue();
      } else {
        console.log('consumed all piskel snapshots');
        deferred.resolve(snapshots);
      }
    };

    return deferred.promise;
  };
})();
