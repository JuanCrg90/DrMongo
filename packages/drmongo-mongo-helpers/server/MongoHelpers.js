// mongo db 1.4 doc, http://mongodb.github.io/node-mongodb-native/1.4/contents.html

let getConnection = (data, cb) => {
  const uri = MongodbUriParser.parse(data.connection.mongoUri);
  if(data.database) {
    uri.database = data.database
  }
  const mongoUri = MongodbUriParser.format(uri);

  log('> connecting to: ' + mongoUri);

  MongoInternals.NpmModules.mongodb.module(mongoUri, (error, db) => {
    if(error) {
      cb(error, null);
    } else {
      cb(null, db);
    }
  });
};


MongoHelpers = {

  getDatabases(connection) {
    let db = MongoHelpers.connect(connection);
    // Use the admin database for the operation
    var adminDb = db.admin();

    // Get all the available databases
    let listDatabasesWrapper = Meteor.wrapAsync(adminDb.listDatabases);
    let databases = listDatabasesWrapper();

    let databasesList;
    if(databases.ok == 0) {
      if(databases.code == 13 && connection.database) {
        databasesList = [{name: connection.database}]
      } else {
        throw new Meteor.Error(databases.code, databases.errmsg);
      }
    } else {
      databasesList = databases.databases;
    }

    db.close();

    let databaseNames = [];
    _.each(databasesList, (value) => {
      if (value.name == 'local' || value.name == 'admin') return false;
      databaseNames.push(value.name)
    });

    return databaseNames;
  },

  getCollections(connection, database) {
    let db = MongoHelpers.connect(connection, database);
    if (db === false) return false;

    let collectionNamesWrapper = Meteor.wrapAsync((cb) => {
      db.collectionNames((error, response) => {
        cb(error, response);
      })
    });
    let collections = collectionNamesWrapper();

    db.close();
    let collectionNames = [];
    _.each(collections, (value) => {
      if (value.name == 'system.indexes') return false;
      collectionNames.push(value.name)
    });
    return collectionNames;
  },

  createCollection(database, collectionName) {
    let db = MongoHelpers.connect(database.connection(), database.name);
    if (db === false) return false;

    let createCollectionWrapper = Meteor.wrapAsync((cb) => {
      db.createCollection(collectionName, (error, response) => {
        cb(null, true);
      });
    });

    let response = createCollectionWrapper();

    db.close();
    return response;
  },

  connect(connection, database = null) {
    const getConnectionWrapper = Meteor.wrapAsync(getConnection);
    return getConnectionWrapper({connection, database});
  },

  connectDatabase(databaseId) {
    const database = Databases.findOne(databaseId);
    return MongoHelpers.connect(database.connection(), database.name);
  }

};
