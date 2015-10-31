ConnectionStructureSubscription = Meteor.subscribe('connectionStructure');

Session.set('showReloadingAlert', false);
CurrentDatabaseId = false;

CurrentSession = new ReactiveObjects({
  connection: null,
  database: null,
  collection: null,
  mongoCollection: null,
  mongoCollectionSubscription: null,
  mountedCollections: null,
  documentsSelector: '{}',
  documentsOptions: {},
  documentsRandomSeed: 0,
  documentsPaginationSkip: 0,
  documentsPaginationLimit: 20
});


Meteor.startup(function() {
});

Tracker.autorun(function () {
  FlowRouter.watchPathChange();
  var currentContext = FlowRouter.current();
  var routeParams = currentContext.params;

  if (!ConnectionStructureSubscription.ready()) return false;

  CurrentSession.connection = null;
  CurrentSession.database = null;
  CurrentSession.collection = null;
  CurrentSession.documentsSelector = '{}';
  CurrentSession.documentsOptions = {};
  CurrentSession.documentPaginationSkip = 0;
  //if (CurrentSession.mongoCollectionSubscription) CurrentSession.mongoCollectionSubscription.stop();

  let Location = {};
  if (routeParams.connection) {
    CurrentSession.connection = Connections.findOne({slug: routeParams.connection});
    if (!CurrentSession.connection) FlowRouter.go('/');

    if (CurrentSession.connection && routeParams.database) {
      CurrentSession.database = Databases.findOne({
        name: routeParams.database,
        connection_id: CurrentSession.connection._id
      });
      if (!CurrentSession.database) FlowRouter.go('/');

      if (dr.isDemo && CurrentSession.database.name.indexOf('dummy') !== 1) FlowRouter.go('/');

      if (CurrentSession.database && !CurrentSession.mountedCollections) {
         Meteor.call('mountCollections', CurrentSession.database._id, function(error, result) {
           if (error) FlowRouter.go('/');
           MountedCollections = result;
        });
        CurrentSession.mountedCollections = mountCollections(CurrentSession.database._id);
        CollectionsAreMounted = true;
      }

      if (CurrentSession.database._id != CurrentDatabaseId && CurrentDatabaseId != false) {
        Session.set('showReloadingAlert', true)
        Meteor.call('changeDatabase');
      } else {
        CurrentDatabaseId = CurrentSession.database._id;
      }

      if (CurrentSession.database && routeParams.collection) {
        CurrentSession.collection = Collections.findOne({
          name: routeParams.collection,
          database_id: CurrentSession.database._id
        });
        if (!CurrentSession.collection) FlowRouter.go('/');

        if (CurrentSession.collection) {
          CurrentSession.mongoCollection = CurrentSession.mountedCollections[CurrentSession.collection._id];
        }
      }
    }
  }
});

Tracker.autorun(function () {
  if (CurrentSession.collection) {
    seo.setTitle(CurrentSession.collection.name);
  } else if (CurrentSession.database) {
    seo.setTitle(CurrentSession.database.name);
  } else if (CurrentSession.connection) {
    seo.setTitle(CurrentSession.connection.name);
  } else {
    seo.setTitle(null);
  }
});

mountCollections = function(databaseId) {
  var mountedCollections = {};

  Collections.find({database_id: databaseId}).forEach((collection) => {
    mountedCollections[collection._id] = new Mongo.Collection(collection.name);
  });

  return mountedCollections;

}
